import { useEffect, useState } from 'react';
import { bitable, dashboard } from '@lark-base-open/js-sdk';
import type { CoordSource, PluginConfig } from '../types';
import { KEY_PLACEHOLDER, isMock, MOCK_CONFIG } from '../mock';

interface Props {
  config: PluginConfig;
}

interface TableOption {
  id: string;
  name: string;
}
interface FieldOption {
  id: string;
  name: string;
  type: unknown;
}

export default function ConfigPanel({ config }: Props) {
  const [tables, setTables] = useState<TableOption[]>([]);
  const [fields, setFields] = useState<FieldOption[]>([]);
  const [form, setForm] = useState<PluginConfig>(config ?? {});
  const [saving, setSaving] = useState(false);
  const [tip, setTip] = useState('');

  useEffect(() => {
    if (isMock()) {
      setTables([{ id: 'mock', name: '门店经纬度（示例）' }]);
      setFields([
        { id: 'name', name: '门店名称', type: 1 },
        { id: 'lng', name: '经度', type: 2 },
        { id: 'lat', name: '纬度', type: 2 },
      ]);
      setForm(MOCK_CONFIG);
      return;
    }
    bitable.base
      .getTableList()
      .then(async (list) => {
        const opts = await Promise.all(
          list.map(async (t) => ({ id: t.id, name: await t.getName() })),
        );
        setTables(opts);
      })
      .catch((e) => setTip(`读取数据表失败：${e?.message ?? e}`));
  }, []);

  useEffect(() => {
    if (isMock() || !form.tableId) return;
    bitable.base
      .getTableById(form.tableId)
      .then(async (t) => {
        const metas = await t.getFieldMetaList();
        setFields(
          metas.map((m: any) => ({ id: m.id, name: m.name ?? m.id, type: m.type })),
        );
      })
      .catch((e) => setTip(`读取字段失败：${e?.message ?? e}`));
  }, [form.tableId]);

  const update = (patch: Partial<PluginConfig>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    setTip('');
    try {
      if (!form.mapKey) {
        setTip('请先填写腾讯地图 key');
        return;
      }
      if (form.coordSource === 'location' && !form.locationFieldId) {
        setTip('请选择地理位置字段');
        return;
      }
      if (form.coordSource === 'lnglat' && (!form.lngFieldId || !form.latFieldId)) {
        setTip('请选择经度字段和纬度字段');
        return;
      }
      if (isMock()) {
        setTip('本地 mock 模式下无法保存，请在飞书仪表盘中配置');
        return;
      }
      const current = await dashboard.getConfig().catch(() => null);
      await dashboard.saveConfig({
        dataConditions: current?.dataConditions ?? [],
        customConfig: { ...form },
      });
      setTip('配置已保存');
    } catch (e: any) {
      setTip(`保存失败：${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="config">
      <div className="config-row">
        <label>数据表</label>
        <select
          value={form.tableId ?? ''}
          onChange={(e) => {
            const id = e.target.value;
            update({ tableId: id, tableName: tables.find((t) => t.id === id)?.name });
          }}
        >
          <option value="">请选择数据表</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="config-row">
        <label>门店名称字段</label>
        <select
          value={form.nameFieldId ?? ''}
          onChange={(e) => update({ nameFieldId: e.target.value })}
        >
          <option value="">（可选）不显示名称</option>
          {fields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div className="config-row">
        <label>坐标来源</label>
        <select
          value={form.coordSource ?? 'lnglat'}
          onChange={(e) => update({ coordSource: e.target.value as CoordSource })}
        >
          <option value="lnglat">经度字段 + 纬度字段</option>
          <option value="location">单个地理位置字段</option>
        </select>
      </div>

      {form.coordSource === 'location' ? (
        <div className="config-row">
          <label>地理位置字段</label>
          <select
            value={form.locationFieldId ?? ''}
            onChange={(e) => update({ locationFieldId: e.target.value })}
          >
            <option value="">请选择字段</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div className="config-row">
            <label>经度字段</label>
            <select
              value={form.lngFieldId ?? ''}
              onChange={(e) => update({ lngFieldId: e.target.value })}
            >
              <option value="">请选择字段</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className="config-row">
            <label>纬度字段</label>
            <select
              value={form.latFieldId ?? ''}
              onChange={(e) => update({ latFieldId: e.target.value })}
            >
              <option value="">请选择字段</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="config-row config-check">
        <label>
          <input
            type="checkbox"
            checked={form.swapLngLat ?? false}
            onChange={(e) => update({ swapLngLat: e.target.checked })}
          />
          经纬度顺序颠倒（点位明显偏移时勾选）
        </label>
      </div>

      <div className="config-row">
        <label>腾讯地图 key</label>
        <input
          type="text"
          value={form.mapKey ?? ''}
          placeholder={KEY_PLACEHOLDER}
          onChange={(e) => update({ mapKey: e.target.value })}
        />
      </div>
      <p className="config-hint">
        key 在前端明文可见，请到腾讯位置服务控制台配置 Referer 白名单，只允许你的 Pages 域名使用。
      </p>

      <button className="config-save" disabled={saving} onClick={handleSave}>
        {saving ? '保存中…' : '保存配置'}
      </button>
      {tip && <p className="config-tip">{tip}</p>}
    </div>
  );
}
