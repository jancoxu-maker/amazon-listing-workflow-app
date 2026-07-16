INSERT INTO brand_profiles (id, name, current_version, created_by)
VALUES
  ('cosyland', 'Cosyland', 1, NULL),
  ('overmont', 'Overmont', 1, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO brand_profile_versions (brand_id, version, rules, created_by)
VALUES
  (
    'cosyland',
    1,
    '{
      "id": "cosyland",
      "name": "Cosyland",
      "tone": "温暖、家庭、亲子、自然材质",
      "colors": [
        {"id": "color-0-F7F3EA", "hex": "#F7F3EA", "ratio": 45},
        {"id": "color-1-A7BFA1", "hex": "#A7BFA1", "ratio": 30},
        {"id": "color-2-D7B98C", "hex": "#D7B98C", "ratio": 25}
      ],
      "backgroundPolicy": "02-07 可使用温暖家庭场景、柔和自然光和浅色背景块；01 不使用。",
      "scenes": ["family kitchen", "bright home", "parent-child daily use"],
      "forbiddenStyles": ["夸张安全承诺", "强促销风", "暗黑科技感"],
      "logoPolicy": "Logo 只允许出现在 A+ 模式图片；主图和非 A+ 图片一律不展示 Logo。",
      "logoPreview": "",
      "arrowStyle": "soft-rounded",
      "titleColor": "#2F4A35",
      "styleRules": ["柔和自然光", "家庭生活感", "避免夸张安全承诺"]
    }'::jsonb,
    NULL
  ),
  (
    'overmont',
    1,
    '{
      "id": "overmont",
      "name": "Overmont",
      "tone": "耐用、户外/厨房实用、现代电商质感",
      "colors": [
        {"id": "color-0-2F3432", "hex": "#2F3432", "ratio": 50},
        {"id": "color-1-D9C4A3", "hex": "#D9C4A3", "ratio": 30},
        {"id": "color-2-2E5F4D", "hex": "#2E5F4D", "ratio": 20}
      ],
      "backgroundPolicy": "02-07 可使用现代厨房、户外或深浅对比背景块；01 不使用。",
      "scenes": ["modern kitchen countertop", "outdoor campsite", "practical cooking scene"],
      "forbiddenStyles": ["廉价促销风", "过度奢华", "卡通风"],
      "logoPolicy": "Logo 只允许出现在 A+ 模式图片；主图和非 A+ 图片一律不展示 Logo。",
      "logoPreview": "",
      "arrowStyle": "bold-callout",
      "titleColor": "#2F3432",
      "styleRules": ["真实材质质感", "干净高对比", "避免廉价促销风"]
    }'::jsonb,
    NULL
  )
ON CONFLICT (brand_id, version) DO NOTHING;
