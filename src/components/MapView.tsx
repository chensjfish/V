import { useEffect, useRef, useState } from 'react';
import { dashboard } from '@lark-base-open/js-sdk';
import { loadPoints } from '../data';
import { DEFAULT_MAP_KEY } from '../mapKey';
import { MARKER_ICON, loadTMap } from '../tmap';
import type { PluginConfig, StorePoint } from '../types';

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
    if (points.length === 0) {
      dashboard.setRendered().catch(() => {});
      return;
    }

    const geometries = points.map((p, i) => ({
      id: String(i),
      styleId: 'store',
      position: new TMap.LatLng(p.lat, p.lng),
    }));

    markerRef.current = new TMap.MultiMarker({
      map,
      styles: {
        store: new TMap.MarkerStyle({
          width: 24,
          height: 32,
          anchor: { x: 12, y: 32 },
          src: MARKER_ICON,
        }),
      },
      geometries,
    });

    markerRef.current.on('click', (evt: any) => {
      const index = Number(evt?.geometry?.id);
      const point = points[index];
      if (!point) return;
      const position = new TMap.LatLng(point.lat, point.lng);
      const content = `<div class="map-info"><div class="map-info-title">${escapeHtml(
        point.name || '未命名门店',
      )}</div><div class="map-info-coord">${point.lng.toFixed(6)}, ${point.lat.toFixed(6)}</div></div>`;
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
    points.forEach((p) => bounds.extend(new TMap.LatLng(p.lat, p.lng)));
    map.fitBounds(bounds, { padding: 60 });

    dashboard.setRendered().catch(() => {});
  }, [status, points]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-canvas" />
      <div className="map-stat">
        共 {stat.total} 条记录，成功打点 {points.length} 个
        {stat.skipped > 0 ? `，跳过 ${stat.skipped} 条（无坐标或坐标超出范围）` : ''}
      </div>
      {status === 'loading' && <div className="map-mask">地图加载中…</div>}
      {status === 'error' && <div className="map-mask map-mask-error">{message}</div>}
      {status === 'ready' && points.length === 0 && message && <div className="map-mask">{message}</div>}
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
