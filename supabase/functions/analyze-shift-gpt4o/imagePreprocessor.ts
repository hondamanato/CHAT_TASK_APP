/**
 * OpenCV.js (WASM版) を使用した画像前処理モジュール
 * シフト表のような表形式画像のOCR精度を向上させる
 */

// OpenCV.jsはCDN経由で読み込む想定
// Deno環境ではfetch + eval、またはnpmモジュールとして読み込み可能

interface ProcessedImage {
  base64: string;
  width: number;
  height: number;
  processingTime: number;
}

/**
 * Base64画像をOpenCVで前処理
 *
 * 処理内容:
 * 1. グレースケール変換
 * 2. CLAHE（コントラスト制限付き適応ヒストグラム均等化）
 * 3. ガウシアンぼかし（ノイズ除去）
 * 4. 二値化（Otsu's method）
 * 5. モルフォロジー変換（ノイズ除去 + 文字補強）
 * 6. シャープ化
 */
export async function preprocessImageForOCR(imageBase64: string): Promise<ProcessedImage> {
  const startTime = Date.now();

  console.log('🖼️ OpenCV画像前処理開始...');

  try {
    // Base64をUint8Arrayに変換
    const binaryString = atob(imageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 簡易的な画像処理（OpenCV.js WASMが利用できない場合のフォールバック）
    // 実際のOpenCV処理は以下のようになる想定:

    /*
    // OpenCV.jsを使用した本格的な処理（参考実装）
    const cv = await loadOpenCV();

    // 画像をMatオブジェクトに変換
    const src = cv.matFromImageData(imageData);
    const gray = new cv.Mat();
    const enhanced = new cv.Mat();
    const binary = new cv.Mat();
    const morphed = new cv.Mat();
    const sharpened = new cv.Mat();

    // 1. グレースケール変換
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // 2. CLAHE（局所的なコントラスト改善）
    const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
    clahe.apply(gray, enhanced);

    // 3. ガウシアンぼかし（ノイズ除去）
    cv.GaussianBlur(enhanced, enhanced, new cv.Size(3, 3), 0);

    // 4. 二値化（Otsu's method - 自動閾値決定）
    cv.threshold(enhanced, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

    // 5. モルフォロジー変換（ノイズ除去 + 文字補強）
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2));
    cv.morphologyEx(binary, morphed, cv.MORPH_CLOSE, kernel);

    // 6. シャープ化（エッジ強調）
    const sharpenKernel = cv.matFromArray(3, 3, cv.CV_32F,
      [0, -1, 0, -1, 5, -1, 0, -1, 0]);
    cv.filter2D(morphed, sharpened, -1, sharpenKernel);

    // MatをBase64に変換
    const canvas = document.createElement('canvas');
    cv.imshow(canvas, sharpened);
    const processedBase64 = canvas.toDataURL().split(',')[1];

    // メモリ解放
    src.delete();
    gray.delete();
    enhanced.delete();
    binary.delete();
    morphed.delete();
    sharpened.delete();
    kernel.delete();
    sharpenKernel.delete();
    */

    // 現時点では元の画像をそのまま返す（フォールバック）
    // TODO: OpenCV.js WASMをDeno環境に統合後、上記の処理を有効化
    console.log('⚠️ OpenCV処理はスキップ（フォールバック）');
    console.log('💡 本格実装には OpenCV.js WASM の統合が必要');

    const processingTime = Date.now() - startTime;

    console.log(`✅ 画像前処理完了 (${processingTime}ms)`);

    return {
      base64: imageBase64, // 現時点では未処理
      width: 0, // TODO: 実装時に設定
      height: 0, // TODO: 実装時に設定
      processingTime
    };

  } catch (error) {
    console.error('❌ 画像前処理エラー:', error);
    throw new Error(`画像前処理に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 画像の品質を評価
 * （将来的な拡張用）
 */
export function evaluateImageQuality(imageBase64: string): {
  brightness: number;
  contrast: number;
  sharpness: number;
  quality: 'high' | 'medium' | 'low';
} {
  // 簡易的な品質評価
  // TODO: 実装
  return {
    brightness: 0.5,
    contrast: 0.5,
    sharpness: 0.5,
    quality: 'medium'
  };
}

/**
 * OpenCV.jsをロード（将来的な実装用）
 */
/*
async function loadOpenCV() {
  // OpenCV.js WASMをCDNまたはnpmから読み込み
  const response = await fetch('https://docs.opencv.org/4.x/opencv.js');
  const code = await response.text();
  // Deno環境での実行方法を検討
  return cv; // グローバルなcvオブジェクト
}
*/
