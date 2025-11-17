from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import numpy as np
import pytesseract
import base64
from typing import List, Dict, Optional
import logging

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Shift Table OCR API")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImageRequest(BaseModel):
    imageBase64: str
    userName: Optional[str] = None

class Cell(BaseModel):
    row: int
    col: int
    x: int
    y: int
    w: int
    h: int
    text: str

class TableStructure(BaseModel):
    tableType: str  # "horizontal" or "vertical"
    headers: List[str]
    cells: List[Cell]
    rowCount: int
    colCount: int
    confidence: float

def preprocess_image(image: np.ndarray) -> np.ndarray:
    """画像の前処理（グレースケール化、二値化、ノイズ除去）"""
    # グレースケール変換
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # ノイズ除去
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)

    # 適応的二値化
    binary = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )

    return binary

def detect_table_lines(binary_image: np.ndarray) -> tuple:
    """表の水平線と垂直線を検出"""
    # 水平線の検出
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    horizontal_lines = cv2.morphologyEx(binary_image, cv2.MORPH_OPEN, horizontal_kernel)

    # 垂直線の検出
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
    vertical_lines = cv2.morphologyEx(binary_image, cv2.MORPH_OPEN, vertical_kernel)

    return horizontal_lines, vertical_lines

def detect_cells(horizontal_lines: np.ndarray, vertical_lines: np.ndarray) -> List[tuple]:
    """セルの座標を検出"""
    # 線の交点を見つける
    table_mask = cv2.add(horizontal_lines, vertical_lines)

    # 輪郭検出
    contours, _ = cv2.findContours(table_mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    # セルの境界ボックスを取得
    cells = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        # 小さすぎるセルは無視
        if w > 20 and h > 20:
            cells.append((x, y, w, h))

    # 座標でソート（上から下、左から右）
    cells = sorted(cells, key=lambda c: (c[1], c[0]))

    return cells

def extract_text_from_cell(image: np.ndarray, x: int, y: int, w: int, h: int) -> str:
    """セルからテキストを抽出"""
    # セル領域を切り出し
    cell_roi = image[y:y+h, x:x+w]

    # OCRでテキスト抽出（日本語対応）
    custom_config = r'--oem 3 --psm 6 -l jpn'
    text = pytesseract.image_to_string(cell_roi, config=custom_config)

    # 改行と空白を削除
    text = text.strip().replace('\n', ' ')

    return text

def organize_cells_into_grid(cells: List[tuple], image_shape: tuple) -> tuple:
    """セルをグリッド構造に整理"""
    if not cells:
        return [], 0, 0

    # Y座標でグループ化（行を特定）
    y_threshold = 10
    rows = []
    current_row = [cells[0]]

    for i in range(1, len(cells)):
        if abs(cells[i][1] - current_row[0][1]) < y_threshold:
            current_row.append(cells[i])
        else:
            rows.append(sorted(current_row, key=lambda c: c[0]))
            current_row = [cells[i]]

    if current_row:
        rows.append(sorted(current_row, key=lambda c: c[0]))

    row_count = len(rows)
    col_count = max(len(row) for row in rows) if rows else 0

    return rows, row_count, col_count

def detect_table_type(headers: List[str]) -> str:
    """表のタイプを判定（横型 or 縦型）"""
    # ヘッダーに日付パターンが多い場合は縦型
    date_pattern_count = sum(1 for h in headers if any(char in h for char in ['日', '月', '火', '水', '木', '金', '土', '/', '-']))

    # 名前パターン（ひらがな・カタカナ・漢字）が多い場合は横型
    name_pattern_count = len(headers) - date_pattern_count

    if date_pattern_count > name_pattern_count:
        return "vertical"  # 日付が横方向 = 縦型表
    else:
        return "horizontal"  # 名前が横方向 = 横型表

@app.post("/analyze-table", response_model=TableStructure)
async def analyze_table(request: ImageRequest):
    """画像から表構造を解析"""
    try:
        logger.info(f"📸 表構造解析開始 (userName: {request.userName})")

        # Base64デコード
        image_data = base64.b64decode(request.imageBase64)
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        logger.info(f"画像サイズ: {image.shape}")

        # 前処理
        binary = preprocess_image(image)

        # 表の線を検出
        h_lines, v_lines = detect_table_lines(binary)

        # セルを検出
        cell_coords = detect_cells(h_lines, v_lines)
        logger.info(f"検出されたセル数: {len(cell_coords)}")

        if not cell_coords:
            raise HTTPException(status_code=400, detail="No table structure detected")

        # グリッド構造に整理
        rows, row_count, col_count = organize_cells_into_grid(cell_coords, image.shape)
        logger.info(f"グリッド構造: {row_count}行 x {col_count}列")

        # 各セルからテキストを抽出
        cells = []
        headers = []

        for row_idx, row in enumerate(rows):
            for col_idx, (x, y, w, h) in enumerate(row):
                text = extract_text_from_cell(image, x, y, w, h)

                cell = Cell(
                    row=row_idx,
                    col=col_idx,
                    x=x,
                    y=y,
                    w=w,
                    h=h,
                    text=text
                )
                cells.append(cell)

                # 最初の行をヘッダーとして扱う
                if row_idx == 0:
                    headers.append(text)

        # 表のタイプを判定
        table_type = detect_table_type(headers)
        logger.info(f"表タイプ: {table_type}")

        # 信頼度計算（空でないセルの割合）
        non_empty_cells = sum(1 for cell in cells if cell.text.strip())
        confidence = non_empty_cells / len(cells) if cells else 0.0

        result = TableStructure(
            tableType=table_type,
            headers=headers,
            cells=cells,
            rowCount=row_count,
            colCount=col_count,
            confidence=confidence
        )

        logger.info(f"✅ 解析完了 (信頼度: {confidence:.2f})")
        return result

    except Exception as e:
        logger.error(f"❌ エラー: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """ヘルスチェック"""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
