/**
 * デフォルトアバター生成ユーティリティ
 * ユーザー名の最初の文字とランダムな背景色でSVGアバターを生成
 */

// パステルカラーパレット（視認性の良い色を選定）
const AVATAR_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#a855f7', // purple
  '#f43f5e', // rose
];

/**
 * ランダムな背景色を取得
 */
export const getRandomAvatarColor = (): string => {
  const randomIndex = Math.floor(Math.random() * AVATAR_COLORS.length);
  return AVATAR_COLORS[randomIndex];
};

/**
 * 名前から表示する文字を取得（最初の1文字、大文字）
 */
export const getInitialLetter = (name: string): string => {
  if (!name || name.trim().length === 0) {
    return '?';
  }
  // 最初の文字を取得（絵文字や特殊文字も考慮）
  const firstChar = name.trim()[0];
  // アルファベットの場合は大文字に変換
  return firstChar.toUpperCase();
};

/**
 * SVGアバター文字列を生成
 * @param name ユーザー名
 * @param backgroundColor 背景色（省略時はランダム）
 * @returns SVG文字列
 */
export const generateAvatarSvg = (name: string, backgroundColor?: string): string => {
  const letter = getInitialLetter(name);
  const bgColor = backgroundColor || getRandomAvatarColor();

  // SVGを生成（200x200サイズ、円形、中央に白文字）
  // dy="0.35em" で垂直方向の中央揃えを実現（dominant-baselineより互換性が高い）
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="100" fill="${bgColor}"/>
  <text x="100" y="100"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="90"
        font-weight="600"
        fill="#FFFFFF"
        text-anchor="middle"
        dy="0.35em">${escapeXml(letter)}</text>
</svg>`;

  return svg;
};

/**
 * XMLエスケープ処理
 */
const escapeXml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * SVG文字列をBase64エンコード
 */
export const svgToBase64 = (svg: string): string => {
  // UTF-8対応のBase64エンコード
  const utf8Bytes = new TextEncoder().encode(svg);
  let binary = '';
  utf8Bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

/**
 * SVG文字列をBlobに変換
 */
export const svgToBlob = (svg: string): Blob => {
  return new Blob([svg], { type: 'image/svg+xml' });
};
