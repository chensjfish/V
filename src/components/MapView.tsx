import { useEffect, useMemo, useRef, useState } from 'react';
import { dashboard } from '@lark-base-open/js-sdk';
import { loadPoints } from '../data';
import { DEFAULT_MAP_KEY } from '../mapKey';
import { makeMarkerIcon, loadTMap } from '../tmap';
import { getBrandColor, styleIdForBrand } from '../brandColors';
import type { PluginConfig, StorePoint } from '../types';
import FilterSelect from './FilterSelect';

interface Props {
  config: PluginConfig;
}

export default function MapView({ config }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const infoRef = useRef<any>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [points, setPoints] = useState<StorePoint[]>([]);
  const [stat, setStat] = useState({ total: 0, skipped: 0 });

  // 省份 / 城市 / 品牌 / 门店功能 / 门店类型 / 经营模式 筛选（品牌及后三个为多选）
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [brandsSelected, setBrandsSelected] = useState<string[]>([]);
  const [funcSelected, setFuncSelected] = useState<string[]>([]);
  const [typeSelected, setTypeSelected] = useState<string[]>([]);
  const [modelSelected, setModelSelected] = useState<string[]>([]);

  const hasProvince = points.some((p) => p.province);
  const hasCity = points.some((p) => p.city);
  const hasBrand = points.some((p) => p.brand);
  const hasFunc = points.some((p) => p.storeFunction);
  const hasType = points.some((p) => p.storeType);
  const hasModel = points.some((p) => p.businessModel);

  const provinces = useMemo(() => {
    const set = new Set<string>();
    points.forEach((p) => p.province && set.add(p.province));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  }, [points]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    points.forEach((p) => {
      if (p.city && (!province || p.province === province)) set.add(p.city);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  }, [points, province]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    points.forEach((p) => p.brand && set.add(p.brand));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  }, [points]);

  const funcs = useMemo(() => {
    const set = new Set<string>();
    points.forEach((p) => p.storeFunction && set.add(p.storeFunction));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  }, [points]);

  const types = useMemo(() => {
    const set = new Set<string>();
    points.forEach((p) => p.storeType && set.add(p.storeType));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  }, [points]);

  const models = useMemo(() => {
    const set = new Set<string>();
    points.forEach((p) => p.businessModel && set.add(p.businessModel));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  }, [points]);

  const filtered = useMemo(
    () =>
      points.filter(
        (p) =>
          (!province || p.province === province) &&
          (!city || p.city === city) &&
          (brandsSelected.length === 0 || brandsSelected.includes(p.brand ?? '')) &&
          (funcSelected.length === 0 || funcSelected.includes(p.storeFunction ?? '')) &&
          (typeSelected.length === 0 || typeSelected.includes(p.storeType ?? '')) &&
          (modelSelected.length === 0 || modelSelected.includes(p.businessModel ?? '')),
      ),
    [points, province, city, brandsSelected, funcSelected, typeSelected, modelSelected],
  );

  // 1. 取数
  useEffect(() => {
    let alive = true;
    if (!config.tableId) {
      setPoints([]);
      setStat({ total: 0, skipped: 0 });
      setMessage('尚未配置数据表，请点击组件右上角 ⋮ → 配置，选择数据表与经纬度字段');
      dashboard.setRendered().catch(() => {});
      return;
    }
    loadPoints(config)
      .then((res) => {
        if (!alive) return;
        setPoints(res.points);
        setStat({ total: res.total, skipped: res.skipped });
        if (res.points.length === 0) {
          setMessage(res.total === 0 ? '该表暂无记录' : '没有解析出有效坐标，请检查字段选择或经纬度顺序');
        }
      })
      .catch((err) => {
        if (!alive) return;
        setStatus('error');
        setMessage(err?.message ?? String(err));
      });
    return () => {
      alive = false;
    };
  }, [config]);

  // 2. 初始化地图
  useEffect(() => {
    // 未配置数据表时优先显示配置引导，不覆盖为 key 的报错
    if (!config.tableId) return;
    // 配置面板没填就回退到内置默认 key
    const mapKey = (config.mapKey ?? '').trim() || DEFAULT_MAP_KEY;
    let alive = true;
    loadTMap(mapKey)
      .then((TMap) => {
        if (!alive || !containerRef.current || mapRef.current) return;
        mapRef.current = new TMap.Map(containerRef.current, {
          zoom: 5,
          center: new TMap.LatLng(34.3, 108.9),
          baseMap: { type: 'vector' },
        });
        setStatus('ready');
      })
      .catch((err) => {
        if (!alive) return;
        setStatus('error');
        setMessage(err?.message ?? String(err));
      });
    return () => {
      alive = false;
    };
  }, [config.mapKey, config.tableId]);

  // 3. 打点 + 自适应视野
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return;
    const TMap = (window as any).TMap;
    const map = mapRef.current;

    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    if (filtered.length === 0) {
      dashboard.setRendered().catch(() => {});
      return;
    }

    const geometries = filtered.map((p, i) => ({
      id: String(i),
      styleId: styleIdForBrand(p.brand),
      position: new TMap.LatLng(p.lat, p.lng),
    }));

    const styles: Record<string, any> = {};
    filtered.forEach((p) => {
      const sid = styleIdForBrand(p.brand);
      if (!styles[sid]) {
        styles[sid] = new TMap.MarkerStyle({
          width: 24,
          height: 32,
          anchor: { x: 12, y: 32 },
          src: makeMarkerIcon(getBrandColor(p.brand)),
        });
      }
    });

    markerRef.current = new TMap.MultiMarker({
      map,
      styles,
      geometries,
    });

    markerRef.current.on('click', (evt: any) => {
      const index = Number(evt?.geometry?.id);
      const point = filtered[index];
      if (!point) return;
      const position = new TMap.LatLng(point.lat, point.lng);
      const addr = [point.province, point.city].filter(Boolean).join(' · ');
      const brandLine = point.brand
        ? `<div class="map-info-brand" style="color:${getBrandColor(point.brand)}">${escapeHtml(
            point.brand,
          )}</div>`
        : '';
      const content = `<div class="map-info"><div class="map-info-title">${escapeHtml(
        point.name || '未命名门店',
      )}</div>${brandLine}${
        addr ? `<div class="map-info-addr">${escapeHtml(addr)}</div>` : ''
      }<div class="map-info-coord">${point.lng.toFixed(6)}, ${point.lat.toFixed(6)}</div></div>`;
      if (!infoRef.current) {
        infoRef.current = new TMap.InfoWindow({
          map,
          position,
          content,
          offset: { x: 0, y: -34 },
          enableCustom: true,
        });
      } else {
        infoRef.current.setPosition(position);
        infoRef.current.setContent(content);
      }
      infoRef.current.open();
    });

    const bounds = new TMap.LatLngBounds();
    filtered.forEach((p) => bounds.extend(new TMap.LatLng(p.lat, p.lng)));
    map.fitBounds(bounds, { padding: 60 });

    dashboard.setRendered().catch(() => {});
  }, [status, filtered]);

  return (
    <div className="map-wrap">
      {(hasProvince || hasCity || hasBrand || hasFunc || hasType || hasModel) && (
        <div className="map-filters">
          {hasProvince && (
            <FilterSelect
              placeholder="全部省份"
              options={provinces}
              value={province}
              onChange={(v) => {
                setProvince(v as string);
                setCity('');
              }}
            />
          )}
          {hasCity && (
            <FilterSelect
              placeholder="全部城市"
              options={cities}
              value={city}
              onChange={(v) => setCity(v as string)}
            />
          )}
          {hasBrand && (
            <FilterSelect
              placeholder="全部品牌"
              multiple
              options={brands}
              value={brandsSelected}
              onChange={(v) => setBrandsSelected(v as string[])}
            />
          )}
          {hasFunc && (
            <FilterSelect
              placeholder="全部功能"
              multiple
              options={funcs}
              value={funcSelected}
              onChange={(v) => setFuncSelected(v as string[])}
            />
          )}
          {hasType && (
            <FilterSelect
              placeholder="全部类型"
              multiple
              options={types}
              value={typeSelected}
              onChange={(v) => setTypeSelected(v as string[])}
            />
          )}
          {hasModel && (
            <FilterSelect
              placeholder="全部模式"
              multiple
              options={models}
              value={modelSelected}
              onChange={(v) => setModelSelected(v as string[])}
            />
          )}
          <span className="map-filter-count">显示 {filtered.length} 个</span>
        </div>
      )}
      <div ref={containerRef} className="map-canvas" />
      <div className="map-stat">
        共 {stat.total} 条记录，成功打点 {points.length} 个
        {stat.skipped > 0 ? `，跳过 ${stat.skipped} 条（无坐标或坐标超出范围）` : ''}
      </div>
      {status === 'loading' && <div className="map-mask">地图加载中…</div>}
      {status === 'error' && <div className="map-mask map-mask-error">{message}</div>}
      {status === 'ready' && points.length === 0 && message && <div className="map-mask">{message}</div>}
      {status === 'ready' && points.length > 0 && filtered.length === 0 && (
        <div className="map-mask">当前筛选条件下没有门店</div>
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[c];
  });
}
