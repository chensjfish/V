export type CoordSource = 'location' | 'lnglat';

/** 存在 dashboard.customConfig 里的插件配置 */
export interface PluginConfig {
  /** 数据表 id */
  tableId?: string;
  tableName?: string;
  /** 门店名称字段（用于气泡标题） */
  nameFieldId?: string;
  /** 坐标来源：location=单个地理位置字段；lnglat=经度+纬度两个字段 */
  coordSource?: CoordSource;
  locationFieldId?: string;
  lngFieldId?: string;
  latFieldId?: string;
  /** 经纬度顺序反了时打开 */
  swapLngLat?: boolean;
  /** 腾讯地图 key（前端明文，务必配置 Referer 白名单） */
  mapKey?: string;
}

export interface StorePoint {
  id: string;
  name: string;
  lng: number;
  lat: number;
}

export interface LoadResult {
  points: StorePoint[];
  total: number;
  skipped: number;
}
