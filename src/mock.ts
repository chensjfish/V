import type { PluginConfig, StorePoint } from './types';

/** 加 ?mock=1 可在本地浏览器里脱离飞书环境调试 UI */
export function isMock(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('mock') === '1';
  } catch {
    return false;
  }
}

/** 本地调试用的 key 占位提示，真实 key 请在配置面板里填 */
export const KEY_PLACEHOLDER = '请在腾讯位置服务开放平台自行申请 key 并替换此占位符';

export const MOCK_CONFIG: PluginConfig = {
  tableId: 'mock',
  tableName: '门店经纬度（示例）',
  coordSource: 'lnglat',
  swapLngLat: false,
};

export const MOCK_POINTS: StorePoint[] = [
  { id: '1', name: '北京示例门店', lng: 116.397128, lat: 39.916527 },
  { id: '2', name: '上海示例门店', lng: 121.473701, lat: 31.230416 },
  { id: '3', name: '广州示例门店', lng: 113.264434, lat: 23.129162 },
  { id: '4', name: '深圳示例门店', lng: 114.057868, lat: 22.543099 },
  { id: '5', name: '成都示例门店', lng: 104.066541, lat: 30.572269 },
  { id: '6', name: '西安示例门店', lng: 108.948024, lat: 34.263161 },
];
