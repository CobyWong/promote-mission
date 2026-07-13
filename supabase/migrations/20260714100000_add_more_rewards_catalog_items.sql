insert into public.rewards_catalog (
  slug,
  name,
  cost,
  badge,
  description,
  fulfillment_eta,
  stock,
  is_active,
  display_order
)
values
  (
    'starbucks-gift-card-100',
    'Starbucks 電子禮卡 HK$100',
    3200,
    'Cafe',
    '適合日常任務完成後即時兌換，輕鬆補充咖啡能量。',
    '1-2 個工作天',
    120,
    true,
    51
  ),
  (
    'netflix-standard-1m',
    'Netflix Standard 一個月',
    4500,
    'Digital',
    '熱門串流獎賞，完成幾個中型任務即可兌換。',
    '1-2 個工作天',
    90,
    true,
    52
  ),
  (
    'uber-eats-coupon-200',
    'Uber Eats 優惠券 HK$200',
    5200,
    'Food',
    '外賣高需求獎賞，適合穩定交稿創作者。',
    '1-3 個工作天',
    70,
    true,
    53
  ),
  (
    'apple-gift-card-500',
    'Apple Gift Card HK$500',
    13500,
    'Popular',
    '高價值熱門選項，可用於 Apple 服務與裝置購買。',
    '2-4 個工作天',
    40,
    true,
    54
  ),
  (
    'nintendo-eshop-300',
    'Nintendo eShop HK$300',
    9800,
    'Gaming',
    '遊戲向創作者常用獎賞，完成系列任務後可直接兌換。',
    '1-3 個工作天',
    55,
    true,
    55
  )
on conflict (slug) do update
set
  name = excluded.name,
  cost = excluded.cost,
  badge = excluded.badge,
  description = excluded.description,
  fulfillment_eta = excluded.fulfillment_eta,
  stock = excluded.stock,
  is_active = excluded.is_active,
  display_order = excluded.display_order;
