/**
 * 各汽车品牌的真实徽章 logo（SVG 内联为 data URL）。
 * 文件名使用 ASCII 别名，避免中文路径在构建/部署时的编码问题；
 * 对外仍用中文品牌名（与飞书表字段值、BRAND_COLORS 保持一致）作为 key。
 */

import xiaopeng from './logos/xiaopeng.svg?raw';
import lixiang from './logos/lixiang.svg?raw';
import tesla from './logos/tesla.svg?raw';
import leapmotor from './logos/leapmotor.svg?raw';
import byd from './logos/byd.svg?raw';
import xiaomi from './logos/xiaomi.svg?raw';
import geelyGalaxy from './logos/geely-galaxy.svg?raw';
import nio from './logos/nio.svg?raw';
import zeekr from './logos/zeekr.svg?raw';

import { makeMarkerIcon } from './tmap';
import { getBrandColor } from './brandColors';

/** 中文品牌名 → 徽章 SVG 原始文本 */
const LOGO_RAW: Record<string, string> = {
  小鹏: xiaopeng,
  理想: lixiang,
  特斯拉: tesla,
  零跑: leapmotor,
  比亚迪: byd,
  小米: xiaomi,
  吉利银河: geelyGalaxy,
  蔚来: nio,
  极氪: zeekr,
};

/** 取某品牌徽章的 data URL（无该品牌返回 undefined）。
 * 注入 width/height，避免部分 <img>/canvas 上下文中因 SVG 缺少尺寸而渲染为 0。 */
export function brandLogoDataUrl(brand?: string, size = 30): string | undefined {
  const raw = brand ? LOGO_RAW[brand] : undefined;
  if (!raw) return undefined;
  let svg = raw;
  if (!/\bwidth\s*=/.test(svg)) {
    svg = svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
  }
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * 生成点位 marker 图标：优先用真实品牌徽章；
 * 未知/缺失品牌回退到品牌色水滴，保证所有点都有可见标记。
 */
export function makeMarkerIconForBrand(brand?: string): string {
  const logo = brandLogoDataUrl(brand);
  if (logo) return logo;
  return makeMarkerIcon(getBrandColor(brand));
}

/**
 * 各品牌「徽章主色」——直接取自对应 SVG 外部徽章 path 的 fill，
 * 保证小圆点颜色与 logo 完全一致（不同于 BRAND_COLORS 的通用配色）。
 */
const LOGO_BADGE_COLORS: Record<string, string> = {
  小鹏: '#000000',
  理想: '#065F46',
  特斯拉: '#E82127',
  零跑: '#6A1B9A',
  比亚迪: '#005BAC',
  小米: '#FF6900',
  吉利银河: '#657292',
  蔚来: '#00BDBD',
  极氪: '#918297',
};

/**
 * 生成「品牌色小圆点」marker 图标：白边实心圆，颜色取各品牌 logo 徽章主色。
 * 用于「仅筛选到省份」的层级——点位密集时用圆点比 logo 更清爽。
 */
export function makeDotIcon(brand?: string): string {
  const color = (brand && LOGO_BADGE_COLORS[brand]) || getBrandColor(brand);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">` +
    `<circle cx="7" cy="7" r="6" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>` +
    `</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
