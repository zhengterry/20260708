export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <div className="mb-14 pb-9 border-b border-[#DFE7E8]">
        <span className="inline-flex items-center gap-2 text-xs tracking-[0.16em] uppercase text-[#0AA6A3] bg-[#E1F5F4] px-3 py-1.5 rounded-full font-bold mb-5">
          V3 · 运单全流程管理
        </span>
        <h1 className="text-[clamp(28px,4vw,42px)] font-bold leading-tight mb-3.5 tracking-[0.01em]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          运单全流程管理系统
        </h1>
        <p className="text-[16px] text-[#4A5A63] font-medium">
          扫描品控 → 异常上报 → 分级审批 → 执行联动
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-12 max-lg:grid-cols-2">
        {[
          { label: '待审批', value: '-', color: 'bg-amber-50 text-amber-700' },
          { label: '审批中', value: '-', color: 'bg-blue-50 text-blue-700' },
          { label: '执行中', value: '-', color: 'bg-teal-50 text-teal-700' },
          { label: '已完成', value: '-', color: 'bg-green-50 text-green-700' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-[#DFE7E8] rounded-2xl p-5">
            <p className="text-xs text-[#7C8A92] font-semibold uppercase tracking-wider">{stat.label}</p>
            <p className="text-3xl font-bold text-[#16232B] mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
        {[
          { title: '扫描品控', desc: '扫描 SKU 录入品控检测', href: '/scan' },
          { title: '异常上报', desc: '手工上报物流异常工单', href: '/tickets/create' },
          { title: '工单审批', desc: '查看待审批工单列表', href: '/approval' },
        ].map((card) => (
          <a
            key={card.title}
            href={card.href}
            className="block bg-white border border-[#DFE7E8] rounded-2xl p-6 hover:border-[#0FC6C2] hover:shadow-sm transition-all group"
          >
            <h3 className="text-lg font-bold text-[#16232B] mb-2 group-hover:text-[#0AA6A3] transition-colors">
              {card.title}
            </h3>
            <p className="text-sm text-[#7C8A92]">{card.desc}</p>
          </a>
        ))}
      </div>

      {/* Info banner */}
      <div className="mt-12 p-5 border-l-3 border-[#0FC6C2] bg-[#EAFBFA] rounded-r-xl text-sm text-[#4A5A63]">
        <strong className="text-[#0AA6A3]">提示：</strong>
        本系统为 V3 独立部署，与 V2 通过接口交互。运单数据每次操作时实时校验。
        所有审批操作受乐观锁并发保护，超时工单由后台定时任务自动处理。
      </div>
    </div>
  );
}
