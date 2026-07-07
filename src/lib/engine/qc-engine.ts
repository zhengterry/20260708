import { db, qcRules } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import type { ScanInput, QcResult, QcRule, QcConditionConfig, RuleHit } from '@/types';

/**
 * 品控规则引擎
 * 从数据库加载活跃规则，逐一匹配扫描输入，返回判定结果
 */
export async function runQcEngine(input: ScanInput): Promise<QcResult> {
  // 加载所有活跃的品控规则
  const rules = await db.select().from(qcRules).where(eq(qcRules.isActive, true));
  const hits: RuleHit[] = [];

  for (const rule of rules) {
    if (matchCondition(rule.conditionConfig as QcConditionConfig, input)) {
      const reason = buildReason(rule as unknown as QcRule, input);
      hits.push({
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        severity: rule.severity as RuleHit['severity'],
        reason,
      });

      // 命中 critical 规则后立即停止后续检查
      if (rule.severity === 'critical') break;
    }
  }

  if (hits.length > 0) {
    const maxSeverity = getMaxSeverity(hits);
    return { result: 'hold', hits, severity: maxSeverity };
  }

  return { result: 'pass', hits: [], severity: 'minor' };
}

function matchCondition(config: QcConditionConfig, input: ScanInput): boolean {
  switch (config.type) {
    case 'qty_diff': {
      if (!input.qtyScanned || !input.qtyExpected || input.qtyExpected === 0) return false;
      const diffPercent = Math.abs((input.qtyExpected - input.qtyScanned) / input.qtyExpected) * 100;
      if (config.operator === '>=') return diffPercent >= config.qtyDiffPercent;
      return diffPercent > config.qtyDiffPercent;
    }
    case 'defect': {
      if (!input.isDefective || !input.defectLevel) return false;
      return input.defectLevel >= config.minDefectLevel;
    }
    case 'spec_diff': {
      if (!input.specDeviation) return false;
      return config.keywords.some(kw =>
        input.specDeviation!.toLowerCase().includes(kw.toLowerCase())
      );
    }
    case 'label_error': {
      // 标签错误规则：检查 SKU 编码或描述
      return config.patterns.some(p => input.skuCode.includes(p));
    }
    case 'batch_error': {
      // 批次异常：检查批次号是否合理
      return !input.batchNo || input.batchNo.length < 5;
    }
    default:
      return false;
  }
}

function buildReason(rule: QcRule, input: ScanInput): string {
  const ruleName = rule.ruleName || rule.ruleCode;
  switch (rule.conditionConfig.type) {
    case 'qty_diff':
      return `[${ruleName}] 数量差异: 预期 ${input.qtyExpected}，实际 ${input.qtyScanned}`;
    case 'defect':
      return `[${ruleName}] 破损等级: ${input.defectLevel} 级`;
    case 'spec_diff':
      return `[${ruleName}] 规格不符: ${input.specDeviation}`;
    case 'label_error':
      return `[${ruleName}] 标签异常: SKU ${input.skuCode}`;
    case 'batch_error':
      return `[${ruleName}] 批次异常: ${input.batchNo || '无批次号'}`;
    default:
      return `[${ruleName}] 触发品控规则`;
  }
}

function getMaxSeverity(hits: RuleHit[]): 'minor' | 'major' | 'critical' {
  const severityRank = { minor: 0, major: 1, critical: 2 };
  return hits.reduce((max, hit) => {
    return severityRank[hit.severity] > severityRank[max] ? hit.severity : max;
  }, 'minor' as 'minor' | 'major' | 'critical');
}

/** 计算数量差异百分比 */
export function calcQtyDiffPercent(qtyExpected: number, qtyScanned: number): number {
  if (qtyExpected === 0) return 0;
  return Math.round(Math.abs((qtyExpected - qtyScanned) / qtyExpected) * 100 * 100) / 100;
}
