/* ============================================================
   64 卦数据 —— 单一标准源 + 全部派生
   ============================================================

   为什么这样写（2026-10-09 重构）：

   旧版每一卦把 number / name / chinese / trigrams / nature / lines
   各自写死一遍，字段之间没有任何约束。结果是 64 卦里有 61 卦的
   六爻结构与它自己的上下卦对不上（例如第 5 卦写着「天水需」，
   但上下卦写的是乾上坎下，等于把上卦下卦写反了）。
   只要是人手抄的第二份数据，就一定会和第一份漂移。

   现在只保留一份权威输入：每卦只声明「卦序 + 卦名 + 上卦 + 下卦」。
   六爻、上下卦、卦性、卦名全称、Unicode 卦符全部由这四项算出来，
   不再手写。结构错不了，因为没有第二处可错。

   易学文案（取象 / 古义 / 数据科学）单独放在 CONTENT，按卦名索引。
   结构层和内容层解耦：结构错了不会连累文案，文案改了也不会动结构。

   约定：爻数组自下而上，lines[0] = 初爻（最下），lines[5] = 上爻（最上）。
   1 = 阳爻（实线），0 = 阴爻（断线）。

   卦序采用通行的文王卦序（与 Unicode「Yijing Hexagram Symbols」
   区块 U+4DC0–U+4DFF 的顺序一致）。结构正确性由 tools/verify-hexagrams.mjs
   用一份独立的基准表 + 文王卦序配对规律交叉校验，不靠人眼。
   ============================================================ */

export type TrigramName = '乾' | '兑' | '离' | '震' | '巽' | '坎' | '艮' | '坤';

export interface TrigramDef {
  /** 三爻，自下而上；1 = 阳，0 = 阴 */
  bits: readonly [0 | 1, 0 | 1, 0 | 1];
  /** 取象（自然物） */
  nature: string;
  /** Unicode 八卦符号（U+2630–U+2637） */
  glyph: string;
}

/**
 * 八卦定义。这是整个结构层的原子：只有这八条是手写的，
 * 其余全部由它们组合出来。
 *
 * bits 按自下而上排列，与 ☰☱☲☳☴☵☶☷ 的 Unicode 字形一致
 * （Unicode 字形是自上而下画的，例如兑 ☱ 是「上断下连」，
 *   自下而上读即 [1, 1, 0]）。
 */
export const TRIGRAMS: Record<TrigramName, TrigramDef> = {
  乾: { bits: [1, 1, 1], nature: '天', glyph: '☰' },
  兑: { bits: [1, 1, 0], nature: '泽', glyph: '☱' },
  离: { bits: [1, 0, 1], nature: '火', glyph: '☲' },
  震: { bits: [1, 0, 0], nature: '雷', glyph: '☳' },
  巽: { bits: [0, 1, 1], nature: '风', glyph: '☴' },
  坎: { bits: [0, 1, 0], nature: '水', glyph: '☵' },
  艮: { bits: [0, 0, 1], nature: '山', glyph: '☶' },
  坤: { bits: [0, 0, 0], nature: '地', glyph: '☷' },
};

export interface Hexagram {
  number: number;
  name: string;
  /** 卦名全称，如「水天需」「乾为天」 */
  chinese: string;
  /** [上卦, 下卦] */
  trigrams: [string, string];
  upper: TrigramName;
  lower: TrigramName;
  /** 卦性，如「水天」「重坎」「纯阳」 */
  nature: string;
  /** 整卦 Unicode 卦符（U+4DC0 + number - 1） */
  glyph: string;
  symbol: string;
  /** 0 = 阴（断线），1 = 阳（实线），自下而上 */
  lines: (0 | 1)[];
  interpretation: string;
  dataScience: string;
}

/* ---------- 唯一权威输入：64 卦的卦序 / 卦名 / 上卦 / 下卦 ---------- */

interface CanonRow {
  readonly number: number;
  readonly name: string;
  readonly upper: TrigramName;
  readonly lower: TrigramName;
}

const CANON = [
  { number: 1, name: '乾', upper: '乾', lower: '乾' },
  { number: 2, name: '坤', upper: '坤', lower: '坤' },
  { number: 3, name: '屯', upper: '坎', lower: '震' },
  { number: 4, name: '蒙', upper: '艮', lower: '坎' },
  { number: 5, name: '需', upper: '坎', lower: '乾' },
  { number: 6, name: '讼', upper: '乾', lower: '坎' },
  { number: 7, name: '师', upper: '坤', lower: '坎' },
  { number: 8, name: '比', upper: '坎', lower: '坤' },
  { number: 9, name: '小畜', upper: '巽', lower: '乾' },
  { number: 10, name: '履', upper: '乾', lower: '兑' },
  { number: 11, name: '泰', upper: '坤', lower: '乾' },
  { number: 12, name: '否', upper: '乾', lower: '坤' },
  { number: 13, name: '同人', upper: '乾', lower: '离' },
  { number: 14, name: '大有', upper: '离', lower: '乾' },
  { number: 15, name: '谦', upper: '坤', lower: '艮' },
  { number: 16, name: '豫', upper: '震', lower: '坤' },
  { number: 17, name: '随', upper: '兑', lower: '震' },
  { number: 18, name: '蛊', upper: '艮', lower: '巽' },
  { number: 19, name: '临', upper: '坤', lower: '兑' },
  { number: 20, name: '观', upper: '巽', lower: '坤' },
  { number: 21, name: '噬嗑', upper: '离', lower: '震' },
  { number: 22, name: '贲', upper: '艮', lower: '离' },
  { number: 23, name: '剥', upper: '艮', lower: '坤' },
  { number: 24, name: '复', upper: '坤', lower: '震' },
  { number: 25, name: '无妄', upper: '乾', lower: '震' },
  { number: 26, name: '大畜', upper: '艮', lower: '乾' },
  { number: 27, name: '颐', upper: '艮', lower: '震' },
  { number: 28, name: '大过', upper: '兑', lower: '巽' },
  { number: 29, name: '坎', upper: '坎', lower: '坎' },
  { number: 30, name: '离', upper: '离', lower: '离' },
  { number: 31, name: '咸', upper: '兑', lower: '艮' },
  { number: 32, name: '恒', upper: '震', lower: '巽' },
  { number: 33, name: '遁', upper: '乾', lower: '艮' },
  { number: 34, name: '大壮', upper: '震', lower: '乾' },
  { number: 35, name: '晋', upper: '离', lower: '坤' },
  { number: 36, name: '明夷', upper: '坤', lower: '离' },
  { number: 37, name: '家人', upper: '巽', lower: '离' },
  { number: 38, name: '睽', upper: '离', lower: '兑' },
  { number: 39, name: '蹇', upper: '坎', lower: '艮' },
  { number: 40, name: '解', upper: '震', lower: '坎' },
  { number: 41, name: '损', upper: '艮', lower: '兑' },
  { number: 42, name: '益', upper: '巽', lower: '震' },
  { number: 43, name: '夬', upper: '兑', lower: '乾' },
  { number: 44, name: '姤', upper: '乾', lower: '巽' },
  { number: 45, name: '萃', upper: '兑', lower: '坤' },
  { number: 46, name: '升', upper: '坤', lower: '巽' },
  { number: 47, name: '困', upper: '兑', lower: '坎' },
  { number: 48, name: '井', upper: '坎', lower: '巽' },
  { number: 49, name: '革', upper: '兑', lower: '离' },
  { number: 50, name: '鼎', upper: '离', lower: '巽' },
  { number: 51, name: '震', upper: '震', lower: '震' },
  { number: 52, name: '艮', upper: '艮', lower: '艮' },
  { number: 53, name: '渐', upper: '巽', lower: '艮' },
  { number: 54, name: '归妹', upper: '震', lower: '兑' },
  { number: 55, name: '丰', upper: '震', lower: '离' },
  { number: 56, name: '旅', upper: '离', lower: '艮' },
  { number: 57, name: '巽', upper: '巽', lower: '巽' },
  { number: 58, name: '兑', upper: '兑', lower: '兑' },
  { number: 59, name: '涣', upper: '巽', lower: '坎' },
  { number: 60, name: '节', upper: '坎', lower: '兑' },
  { number: 61, name: '中孚', upper: '巽', lower: '兑' },
  { number: 62, name: '小过', upper: '震', lower: '艮' },
  { number: 63, name: '既济', upper: '坎', lower: '离' },
  { number: 64, name: '未济', upper: '离', lower: '坎' },
] as const satisfies readonly CanonRow[];

/** 由 CANON 推出的卦名联合类型，用来强制 CONTENT 覆盖全部 64 卦 */
type HexName = (typeof CANON)[number]['name'];

/* ---------- 内容层：按卦名索引，与结构层解耦 ---------- */

interface HexContent {
  symbol: string;
  interpretation: string;
  dataScience: string;
}

const CONTENT: Record<HexName, HexContent> = {
  乾: {
    symbol: "天、父、君",
    interpretation: "乾卦为六十四卦之首，象征天、创始与纯粹阳刚之力。六爻皆阳，代表事物发展的六个阶段：元亨利贞。",
    dataScience: "乾卦代表系统中的最大能量态——所有变量均处于正向激活状态，对应于时间序列中的持续增长阶段。",
  },
  坤: {
    symbol: "地、母、臣",
    interpretation: "坤卦为第二卦，象征大地、包容与柔顺。六爻皆阴，代表承载与滋养万物之德。",
    dataScience: "坤卦代表系统的基线状态——所有变量处于静默或零值状态，是数据分布的基准参考系。",
  },
  屯: {
    symbol: "初创、艰难",
    interpretation: "屯卦象征万物初生之难，创业起步阶段。险难在前，宜守正待时。",
    dataScience: "屯卦对应系统启动阶段的混沌与不确定性——初始参数尚未收敛，梯度方向不稳定。",
  },
  蒙: {
    symbol: "启蒙、学习",
    interpretation: "蒙卦象征童蒙未开，需要教育与引导。山下出泉，启蒙之道在于循序渐进。",
    dataScience: "蒙卦对应数据探索的早期阶段——特征尚未被充分理解，需要通过降维与可视化来揭示结构。",
  },
  需: {
    symbol: "等待、积蓄",
    interpretation: "需卦象征等待与积蓄。雨欲下未下，万物翘首以待。时机未至，宜守正等待。",
    dataScience: "需卦对应数据积累阶段——样本量不足时不宜急于建模，需要等待足够的数据支撑。",
  },
  讼: {
    symbol: "争讼、冲突",
    interpretation: "讼卦象征争讼与对立。上乾下坎，刚上柔下，阴阳不合而生争。",
    dataScience: "讼卦对应模型中的对抗性冲突——如 GAN 中的生成器与判别器之间的博弈过程。",
  },
  师: {
    symbol: "军队、统帅",
    interpretation: "师卦象征军队与统帅。地中有水，蓄势待发。行军打仗需要严明的纪律与正确的领导。",
    dataScience: "师卦对应集成学习中的强学习器——多个弱模型在统一调度下形成强大的预测能力。",
  },
  比: {
    symbol: "亲比、团结",
    interpretation: "比卦象征亲比与团结。水在地上，亲密无间。团结合作方能成事。",
    dataScience: "比卦对应数据融合与多源对齐——将不同来源的数据整合为统一的表示空间。",
  },
  小畜: {
    symbol: "小畜、蓄积",
    interpretation: "小畜卦象征小有蓄积。风在天上，力不足以行远。宜小规模积累，勿贪大。",
    dataScience: "小畜卦对应小样本学习——数据有限时通过迁移学习和数据增强来提升模型能力。",
  },
  履: {
    symbol: "履践、谨慎",
    interpretation: "履卦象征谨慎行事。天在上，泽在下，各安其位。履虎尾而不咥，亨。",
    dataScience: "履卦对应模型的安全性与鲁棒性——在边界条件下谨慎预测，避免过拟合导致的灾难性输出。",
  },
  泰: {
    symbol: "通泰、安泰",
    interpretation: "泰卦象征通泰与安泰。天地交泰，万物通达。阴阳沟通，元气和谐。",
    dataScience: "泰卦对应模型的理想状态——训练与验证分布对齐，损失收敛，泛化能力良好。",
  },
  否: {
    symbol: "闭塞、不通",
    interpretation: "否卦象征闭塞不通。天地不交，阴阳隔绝。君子以俭德辟难，不可荣以禄。",
    dataScience: "否卦对应模型的分布偏移——训练与测试数据分布不一致，导致性能急剧下降。",
  },
  同人: {
    symbol: "与人同、团结",
    interpretation: "同人卦象征与人同心。天在上，火在下，光明普照。团结协作方能成就大业。",
    dataScience: "同人卦对应联邦学习与分布式训练——多个节点协同优化，共享知识而不共享数据。",
  },
  大有: {
    symbol: "富有、大有",
    interpretation: "大有卦象征大有收获。火在天上，照耀万物。丰盛之象，宜守正持中。",
    dataScience: "大有卦对应模型的高性能状态——准确率高、损失低、特征表达丰富且 discriminative。",
  },
  谦: {
    symbol: "谦逊、谦卑",
    interpretation: "谦卦象征谦逊之美。地中有山，山本高而地洼之。谦则亨，君子有终。",
    dataScience: "谦卦对应正则化与模型压缩——降低模型复杂度以换取更好的泛化能力。",
  },
  豫: {
    symbol: "预备、欢乐",
    interpretation: "豫卦象征预备与欢乐。雷出地奋，万物震动。预先准备则喜悦随之而来。",
    dataScience: "豫卦对应数据预处理与特征工程——充分的准备是后续分析成功的关键。",
  },
  随: {
    symbol: "随顺、追随",
    interpretation: "随卦象征随顺与追随。泽中有雷，随风而动。随时而动，顺势而为。",
    dataScience: "随卦对应自适应学习率与在线学习——根据数据流的变化动态调整模型参数。",
  },
  蛊: {
    symbol: "蛊惑、整治",
    interpretation: "蛊卦象征整治与革新。山下有风，风行地上以振民。蛊则可治，败坏可兴。",
    dataScience: "蛊卦对应模型诊断与修复——识别并修正模型中的缺陷与偏差。",
  },
  临: {
    symbol: "来临、监临",
    interpretation: "临卦象征来临与统治。泽上有地，大者来临。君子以教思无穷。",
    dataScience: "临卦对应模型部署与监控——将训练好的模型部署到生产环境并持续监控其表现。",
  },
  观: {
    symbol: "观察、观瞻",
    interpretation: "观卦象征观察与观瞻。风行地上，无处不在。观之以道，察之以理。",
    dataScience: "观卦对应可解释性与可视化——通过观察数据分布和模型行为来理解其决策逻辑。",
  },
  噬嗑: {
    symbol: "咬合、决断",
    interpretation: "噬嗑卦象征咬合与决断。雷火相交，阴阳相搏。遇险能止，知难而退。",
    dataScience: "噬嗑卦对应异常检测与决策边界——识别数据中的异常点并做出正确分类决策。",
  },
  贲: {
    symbol: "文饰、美化",
    interpretation: "贲卦象征文饰与美化。山上有火，光明照山。饰之以文，润之以质。",
    dataScience: "贲卦对应数据可视化与特征呈现——以美观且信息丰富的方式展示数据洞察。",
  },
  剥: {
    symbol: "剥落、衰败",
    interpretation: "剥卦象征剥落与衰败。山附于地，剥落殆尽。君子以厚下安宅。",
    dataScience: "剥卦对应模型的退化与过拟合——训练过度导致模型在训练集上表现好但泛化能力差。",
  },
  复: {
    symbol: "回复、复兴",
    interpretation: "复卦象征回复与复兴。一阳生于五阴之下，阳气回归。君子以见善则迁。",
    dataScience: "复卦对应模型的重启与迁移学习——从预训练或先前状态恢复，继续学习新任务。",
  },
  无妄: {
    symbol: "无妄、真实",
    interpretation: "无妄卦象征无妄与真实。天雷无妄，万物自然而真实。不妄为则无不利。",
    dataScience: "无妄卦对应数据的真实性与诚实建模——不伪造数据，不夸大模型能力，如实报告结果。",
  },
  大畜: {
    symbol: "大畜、积蓄",
    interpretation: "大畜卦象征大积蓄。山在天上，止而蓄之。君子以多识前言往行。",
    dataScience: "大畜卦对应大规模预训练——在海量数据上预训练模型，积蓄知识以备下游任务使用。",
  },
  颐: {
    symbol: "颐养、养育",
    interpretation: "颐卦象征颐养与养育。山上有雷，雷出山中。养正则正，养不正则邪。",
    dataScience: "颐卦对应数据质量与特征健康——确保输入数据的质量和特征的健康性，避免数据污染。",
  },
  大过: {
    symbol: "大过、栋梁",
    interpretation: "大过卦象征大过与栋梁。泽上于风，栋桡矣。大人以栋梁而任天下之重。",
    dataScience: "大过卦对应模型的鲁棒性与泛化——在极端条件下仍能保持合理表现的模型。",
  },
  坎: {
    symbol: "水、险、陷",
    interpretation: "坎卦为重险之象，坎中有险，险中有险。君子以常德行，习教事。",
    dataScience: "坎卦对应数据中的噪声与不确定性——模型需要在充满噪声的环境中保持稳定。",
  },
  离: {
    symbol: "火、明、附",
    interpretation: "离卦为明照之象，离中有明，明中有附。大人以明照于四方。",
    dataScience: "离卦对应模型的可解释性与透明度——模型如明灯照四方，决策过程清晰可察。",
  },
  咸: {
    symbol: "感应、咸感",
    interpretation: "咸卦象征感应与咸感。泽上有山，山泽通气。感应之道在于无心之感。",
    dataScience: "咸卦对应无监督学习中的特征关联——发现数据中隐藏的结构与关联模式。",
  },
  恒: {
    symbol: "恒久、持久",
    interpretation: "恒卦象征恒久与持久。雷风相随，恒久之道。君子以立不易方。",
    dataScience: "恒卦对应模型的稳定性与一致性——在多次运行中产生一致结果的可靠模型。",
  },
  遁: {
    symbol: "遁退、隐退",
    interpretation: "遁卦象征遁退与隐退。天在上，山在下，山高而天更高。遁世无闷。",
    dataScience: "遁卦对应模型的早停与正则化——在适当时候停止训练以避免过拟合。",
  },
  大壮: {
    symbol: "大壮、强盛",
    interpretation: "大壮卦象征大壮与强盛。雷在天上，声势浩大。君子以非礼弗履。",
    dataScience: "大壮卦对应模型的高置信度预测——在数据充足且特征清晰时的强预测能力。",
  },
  晋: {
    symbol: "进长、晋升",
    interpretation: "晋卦象征进长与晋升。火在地上，明照于地。晋康侯用锡马蕃庶。",
    dataScience: "晋卦对应模型的持续改进——通过迭代优化不断提升模型性能。",
  },
  明夷: {
    symbol: "明夷、光明受损",
    interpretation: "明夷卦象征光明受损。地中有火，光明隐伏。君子以莅众，用晦而明。",
    dataScience: "明夷卦对应对抗样本与鲁棒性——模型在正常条件下表现良好，但在对抗扰动下失效。",
  },
  家人: {
    symbol: "家人、家庭",
    interpretation: "家人卦象征家庭与家人。风自火出，家风传承。君子以言有物而行有恒。",
    dataScience: "家人卦对应特征之间的内在关联——特征如同家庭成员，相互依存共同构成完整表示。",
  },
  睽: {
    symbol: "睽异、对立",
    interpretation: "睽卦象征睽异与对立。火在上，泽在下，两火相违。睽而能异，异而能和。",
    dataScience: "睽卦对应多任务学习中的冲突与协调——不同任务之间可能存在矛盾，需要找到平衡。",
  },
  蹇: {
    symbol: "蹇难、蹇滞",
    interpretation: "蹇卦象征蹇难与蹇滞。山上有泽，险在前而止。蹇之时用大矣哉。",
    dataScience: "蹇卦对应模型训练中的困难与瓶颈——梯度消失、局部最优等训练难题。",
  },
  解: {
    symbol: "解脱、化解",
    interpretation: "解卦象征解脱与化解。雷水解，险以动，动而免乎险。君子以赦罪宥功。",
    dataScience: "解卦对应模型的故障恢复与容错——当模型遇到错误输入时能够优雅地恢复。",
  },
  损: {
    symbol: "损减、减损",
    interpretation: "损卦象征损减与减损。泽上有山，山高泽低。损下益上，损己利人。",
    dataScience: "损卦对应知识蒸馏与模型压缩——通过减少模型复杂度来提升效率。",
  },
  益: {
    symbol: "增益、利益",
    interpretation: "益卦象征增益与利益。风雷相益，损上益下。君子以见善则迁，有过则改。",
    dataScience: "益卦对应模型的正则化增益——通过正则化项提升模型的泛化能力。",
  },
  夬: {
    symbol: "决断、夬决",
    interpretation: "夬卦象征决断与夬决。泽上于天，阳气盛而阴欲决。扬于王庭，孚号有厉。",
    dataScience: "夬卦对应模型的决策边界与分类置信度——在边界模糊时做出果断的分类决策。",
  },
  姤: {
    symbol: "相遇、邂逅",
    interpretation: "姤卦象征相遇与邂逅。天风姤，柔遇刚也。勿用取女，见金夫。",
    dataScience: "姤卦对应数据中的意外关联——在特征空间中发现的非预期但有意义的模式。",
  },
  萃: {
    symbol: "聚集、荟萃",
    interpretation: "萃卦象征聚集与荟萃。泽上于地，水聚也。君子以除戎器，戒不虞。",
    dataScience: "萃卦对应数据聚类与样本聚合——将相似的数据点聚集在一起形成有意义的群组。",
  },
  升: {
    symbol: "上升、升进",
    interpretation: "升卦象征上升与升进。地中生木，升也。君子以顺德，积小以高大。",
    dataScience: "升卦对应模型的渐进式提升——通过逐步优化和迭代实现性能的持续上升。",
  },
  困: {
    symbol: "困顿、困境",
    interpretation: "困卦象征困顿与困境。泽无水，困也。君子以致命遂志。",
    dataScience: "困卦对应模型的资源受限场景——在计算或数据受限时仍需做出最佳预测。",
  },
  井: {
    symbol: "井、源泉",
    interpretation: "井卦象征井与源泉。井收勿幕，有孚元吉。改邑不改井。",
    dataScience: "井卦对应数据管道与特征存储——稳定、可复用的数据基础设施是所有分析的基础。",
  },
  革: {
    symbol: "变革、革新",
    interpretation: "革卦象征变革与革新。泽中有火，革也。君子以治历明时。",
    dataScience: "革卦对应模型的版本迭代与架构变革——在适当时机进行模型重构与升级。",
  },
  鼎: {
    symbol: "鼎、革新",
    interpretation: "鼎卦象征鼎与烹饪。木上有火，鼎也。君子以正位凝命。",
    dataScience: "鼎卦对应模型训练的核心过程——将原始数据转化为有价值的知识输出。",
  },
  震: {
    symbol: "雷、动、惊",
    interpretation: "震卦象征雷与震动。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。",
    dataScience: "震卦对应模型对分布外数据的响应——面对未知输入时的警觉与稳健应对。",
  },
  艮: {
    symbol: "山、止、限",
    interpretation: "艮卦象征山与止息。艮其背，不获其身。君子以思不出其位。",
    dataScience: "艮卦对应模型的停止条件与收敛——在适当的时候停止学习，保持当前状态。",
  },
  渐: {
    symbol: "渐进、渐长",
    interpretation: "渐卦象征渐进与渐长。风山渐，循序渐进。鸿渐于陆，其羽可用为仪。",
    dataScience: "渐卦对应模型的渐进式训练——逐步增加数据量和模型复杂度，稳步提升性能。",
  },
  归妹: {
    symbol: "归妹、嫁娶",
    interpretation: "归妹卦象征归妹与嫁娶。泽上有雷，雷归妹。归妹以娣，跛能履。",
    dataScience: "归妹卦对应多模态融合——将不同来源的数据（模态）整合为统一的表示。",
  },
  丰: {
    symbol: "丰盛、丰大",
    interpretation: "丰卦象征丰盛与丰大。雷火交加，光明盛大。丰其蔀，日中见斗。",
    dataScience: "丰卦对应模型的高性能状态——在充足数据和良好特征下的丰盛预测能力。",
  },
  旅: {
    symbol: "旅人、旅途",
    interpretation: "旅卦象征旅人与旅途。火山旅，羁旅也。君子以明慎用刑而不留狱。",
    dataScience: "旅卦对应模型的跨域迁移——在不同数据分布之间旅行并保持泛化能力。",
  },
  巽: {
    symbol: "风、顺、入",
    interpretation: "巽卦象征风与顺入。巽为小，风为柔。君子以申命行事。",
    dataScience: "巽卦对应模型的灵活性与适应性——如风般随形就势，适应不同的数据分布。",
  },
  兑: {
    symbol: "泽、悦、说",
    interpretation: "兑卦象征泽与喜悦。兑为说，悦也。君子以朋友讲习。",
    dataScience: "兑卦对应模型的友好交互与可解释输出——让用户愉悦地理解和使用模型。",
  },
  涣: {
    symbol: "涣散、消散",
    interpretation: "涣卦象征涣散与消散。风水涣，涣也。君子以散则疑。",
    dataScience: "涣卦对应模型的过拟合与知识扩散——模型在训练集上过度学习导致泛化能力涣散。",
  },
  节: {
    symbol: "节制、节度",
    interpretation: "节卦象征节制与节度。水泽节，节以制度。君子以制数度，议德行。",
    dataScience: "节卦对应模型的正则化与约束——通过约束条件控制模型复杂度与行为。",
  },
  中孚: {
    symbol: "中孚、信孚",
    interpretation: "中孚卦象征中孚与信孚。泽上有风，中孚。豚鱼吉，利涉大川。",
    dataScience: "中孚卦对应模型的可信度评估——评估模型预测的置信度与可靠性。",
  },
  小过: {
    symbol: "小过、小有过越",
    interpretation: "小过卦象征小过与小有过越。雷山小过，弗过防之。飞鸟遗之音。",
    dataScience: "小过卦对应模型的微调与轻量优化——在预训练基础上进行小规模调整。",
  },
  既济: {
    symbol: "既济、完成",
    interpretation: "既济卦象征既济与完成。水在火上，事物完成。亨小，利贞。",
    dataScience: "既济卦对应模型的完成状态——训练收敛、性能达标、准备部署上线。",
  },
  未济: {
    symbol: "未济、未完成",
    interpretation: "未济卦象征未济与未完成。火在水上，事物未成。亨。小狐汔济。",
    dataScience: "未济卦对应模型的持续学习与在线更新——模型永远处于未完成状态，需要持续学习。",
  },
};

/* ---------- 派生 ---------- */

/** 八纯卦的卦性写法（其余六卦为「重X」） */
const PURE_NATURE: Partial<Record<TrigramName, string>> = {
  乾: '纯阳',
  坤: '纯阴',
};

/**
 * 由上下卦推出六爻：下卦三爻在前（初爻至三爻），上卦三爻在后（四爻至上爻）。
 */
export function linesFromTrigrams(upper: TrigramName, lower: TrigramName): (0 | 1)[] {
  return [...TRIGRAMS[lower].bits, ...TRIGRAMS[upper].bits];
}

/** 由六爻反推上下卦（用于交叉校验） */
export function trigramsFromLines(lines: readonly (0 | 1)[]): [TrigramName, TrigramName] {
  const names = Object.keys(TRIGRAMS) as TrigramName[];
  const lower = lines.slice(0, 3).join('');
  const upper = lines.slice(3, 6).join('');
  const find = (key: string) =>
    names.find((n) => TRIGRAMS[n].bits.join('') === key)!;
  return [find(upper), find(lower)];
}

/** Unicode 卦符：U+4DC0–U+4DFF 按文王卦序排列，偏移量正好是卦序减一 */
export function hexagramGlyph(number: number): string {
  return String.fromCodePoint(0x4dc0 + number - 1);
}

function buildHexagram(row: (typeof CANON)[number]): Hexagram {
  const upperDef = TRIGRAMS[row.upper];
  const lowerDef = TRIGRAMS[row.lower];
  const content = CONTENT[row.name];
  const isPure = row.upper === row.lower;

  return {
    number: row.number,
    name: row.name,
    chinese: isPure
      ? `${row.name}为${upperDef.nature}`
      : `${upperDef.nature}${lowerDef.nature}${row.name}`,
    trigrams: [row.upper, row.lower],
    upper: row.upper,
    lower: row.lower,
    nature: isPure
      ? (PURE_NATURE[row.upper] ?? `重${row.name}`)
      : `${upperDef.nature}${lowerDef.nature}`,
    glyph: hexagramGlyph(row.number),
    symbol: content.symbol,
    lines: linesFromTrigrams(row.upper, row.lower),
    interpretation: content.interpretation,
    dataScience: content.dataScience,
  };
}

/** 六十四卦，按文王卦序 1..64 */
export const hexagrams: Hexagram[] = CANON.map(buildHexagram);

/* ---------- 查询与统计 ---------- */

/** 按卦序取卦 */
export function getHexagram(number: number): Hexagram | undefined {
  return hexagrams.find((h) => h.number === number);
}

/** 获取卦的阴阳线数组（从下到上） */
export function getHexagramLines(number: number): (0 | 1)[] {
  return getHexagram(number)?.lines ?? [0, 0, 0, 0, 0, 0];
}

/** 判断爻是阳还是阴 */
export function isYang(line: 0 | 1): boolean {
  return line === 1;
}

/** 计算卦中阳爻数量 */
export function countYang(lines: (0 | 1)[]): number {
  return lines.filter((l) => l === 1).length;
}

/** 计算卦中阴爻数量 */
export function countYin(lines: (0 | 1)[]): number {
  return lines.filter((l) => l === 0).length;
}

/** 获取卦的「卦值」（二进制表示，lines[0] 为最低位） */
export function hexagramValue(lines: (0 | 1)[]): number {
  return lines.reduce((acc: number, line: number, i: number) => acc + (line << i), 0);
}

/** 生成所有卦的统计摘要 */
export function generateHexagramStats() {
  const yangCounts = hexagrams.map((h) => countYang(h.lines));
  const yinCounts = hexagrams.map((h) => countYin(h.lines));
  const values = hexagrams.map((h) => hexagramValue(h.lines));

  return {
    total: hexagrams.length,
    yangCounts,
    yinCounts,
    values,
    avgYang: yangCounts.reduce((a, b) => a + b, 0) / yangCounts.length,
    avgYin: yinCounts.reduce((a, b) => a + b, 0) / yinCounts.length,
  };
}
