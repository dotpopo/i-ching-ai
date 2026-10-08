/* ===== 64 卦数据 ===== */

export interface Hexagram {
  number: number;
  name: string;
  chinese: string;
  trigrams: [string, string];
  nature: string;
  symbol: string;
  lines: (0 | 1)[]; // 0 = yin (broken), 1 = yang (solid), bottom to top
  interpretation: string;
  dataScience: string;
}

// 64 卦数据：lines[0] = 初爻（最下），lines[5] = 上爻（最上）
export const hexagrams: Hexagram[] = [
  {
    number: 1, name: "乾", chinese: "乾为天",
    trigrams: ["乾", "乾"],
    nature: "纯阳",
    symbol: "天、父、君",
    lines: [1, 1, 1, 1, 1, 1],
    interpretation: "乾卦为六十四卦之首，象征天、创始与纯粹阳刚之力。六爻皆阳，代表事物发展的六个阶段：元亨利贞。",
    dataScience: "乾卦代表系统中的最大能量态——所有变量均处于正向激活状态，对应于时间序列中的持续增长阶段。"
  },
  {
    number: 2, name: "坤", chinese: "坤为地",
    trigrams: ["坤", "坤"],
    nature: "纯阴",
    symbol: "地、母、臣",
    lines: [0, 0, 0, 0, 0, 0],
    interpretation: "坤卦为第二卦，象征大地、包容与柔顺。六爻皆阴，代表承载与滋养万物之德。",
    dataScience: "坤卦代表系统的基线状态——所有变量处于静默或零值状态，是数据分布的基准参考系。"
  },
  {
    number: 3, name: "屯", chinese: "水雷屯",
    trigrams: ["坎", "震"],
    nature: "水雷",
    symbol: "初创、艰难",
    lines: [0, 1, 0, 0, 0, 1],
    interpretation: "屯卦象征万物初生之难，创业起步阶段。险难在前，宜守正待时。",
    dataScience: "屯卦对应系统启动阶段的混沌与不确定性——初始参数尚未收敛，梯度方向不稳定。"
  },
  {
    number: 4, name: "蒙", chinese: "山水蒙",
    trigrams: ["艮", "坎"],
    nature: "山水",
    symbol: "启蒙、学习",
    lines: [0, 0, 0, 1, 0, 1],
    interpretation: "蒙卦象征童蒙未开，需要教育与引导。山下出泉，启蒙之道在于循序渐进。",
    dataScience: "蒙卦对应数据探索的早期阶段——特征尚未被充分理解，需要通过降维与可视化来揭示结构。"
  },
  {
    number: 5, name: "需", chinese: "天水需",
    trigrams: ["乾", "坎"],
    nature: "天水",
    symbol: "等待、积蓄",
    lines: [1, 0, 0, 0, 0, 1],
    interpretation: "需卦象征等待与积蓄。雨欲下未下，万物翘首以待。时机未至，宜守正等待。",
    dataScience: "需卦对应数据积累阶段——样本量不足时不宜急于建模，需要等待足够的数据支撑。"
  },
  {
    number: 6, name: "讼", chinese: "天水讼",
    trigrams: ["乾", "坎"],
    nature: "天水",
    symbol: "争讼、冲突",
    lines: [1, 0, 0, 0, 1, 1],
    interpretation: "讼卦象征争讼与对立。上乾下坎，刚上柔下，阴阳不合而生争。",
    dataScience: "讼卦对应模型中的对抗性冲突——如 GAN 中的生成器与判别器之间的博弈过程。"
  },
  {
    number: 7, name: "师", chinese: "地水师",
    trigrams: ["坤", "坎"],
    nature: "地水",
    symbol: "军队、统帅",
    lines: [0, 0, 0, 1, 0, 0],
    interpretation: "师卦象征军队与统帅。地中有水，蓄势待发。行军打仗需要严明的纪律与正确的领导。",
    dataScience: "师卦对应集成学习中的强学习器——多个弱模型在统一调度下形成强大的预测能力。"
  },
  {
    number: 8, name: "比", chinese: "水地比",
    trigrams: ["坎", "坤"],
    nature: "水地",
    symbol: "亲比、团结",
    lines: [0, 0, 1, 0, 0, 0],
    interpretation: "比卦象征亲比与团结。水在地上，亲密无间。团结合作方能成事。",
    dataScience: "比卦对应数据融合与多源对齐——将不同来源的数据整合为统一的表示空间。"
  },
  {
    number: 9, name: "小畜", chinese: "风天小畜",
    trigrams: ["巽", "乾"],
    nature: "风天",
    symbol: "小畜、蓄积",
    lines: [1, 0, 1, 1, 1, 1],
    interpretation: "小畜卦象征小有蓄积。风在天上，力不足以行远。宜小规模积累，勿贪大。",
    dataScience: "小畜卦对应小样本学习——数据有限时通过迁移学习和数据增强来提升模型能力。"
  },
  {
    number: 10, name: "履", chinese: "天泽履",
    trigrams: ["乾", "兑"],
    nature: "天泽",
    symbol: "履践、谨慎",
    lines: [1, 1, 1, 1, 0, 1],
    interpretation: "履卦象征谨慎行事。天在上，泽在下，各安其位。履虎尾而不咥，亨。",
    dataScience: "履卦对应模型的安全性与鲁棒性——在边界条件下谨慎预测，避免过拟合导致的灾难性输出。"
  },
  {
    number: 11, name: "泰", chinese: "地天泰",
    trigrams: ["坤", "乾"],
    nature: "地天",
    symbol: "通泰、安泰",
    lines: [0, 0, 0, 1, 1, 1],
    interpretation: "泰卦象征通泰与安泰。天地交泰，万物通达。阴阳沟通，元气和谐。",
    dataScience: "泰卦对应模型的理想状态——训练与验证分布对齐，损失收敛，泛化能力良好。"
  },
  {
    number: 12, name: "否", chinese: "天地否",
    trigrams: ["乾", "坤"],
    nature: "天地",
    symbol: "闭塞、不通",
    lines: [1, 1, 1, 0, 0, 0],
    interpretation: "否卦象征闭塞不通。天地不交，阴阳隔绝。君子以俭德辟难，不可荣以禄。",
    dataScience: "否卦对应模型的分布偏移——训练与测试数据分布不一致，导致性能急剧下降。"
  },
  {
    number: 13, name: "同人", chinese: "天火同人",
    trigrams: ["乾", "离"],
    nature: "天火",
    symbol: "与人同、团结",
    lines: [1, 1, 1, 0, 1, 1],
    interpretation: "同人卦象征与人同心。天在上，火在下，光明普照。团结协作方能成就大业。",
    dataScience: "同人卦对应联邦学习与分布式训练——多个节点协同优化，共享知识而不共享数据。"
  },
  {
    number: 14, name: "大有", chinese: "火天大有",
    trigrams: ["离", "乾"],
    nature: "火天",
    symbol: "富有、大有",
    lines: [1, 0, 1, 1, 1, 1],
    interpretation: "大有卦象征大有收获。火在天上，照耀万物。丰盛之象，宜守正持中。",
    dataScience: "大有卦对应模型的高性能状态——准确率高、损失低、特征表达丰富且 discriminative。"
  },
  {
    number: 15, name: "谦", chinese: "地山谦",
    trigrams: ["坤", "艮"],
    nature: "地山",
    symbol: "谦逊、谦卑",
    lines: [0, 0, 0, 0, 1, 0],
    interpretation: "谦卦象征谦逊之美。地中有山，山本高而地洼之。谦则亨，君子有终。",
    dataScience: "谦卦对应正则化与模型压缩——降低模型复杂度以换取更好的泛化能力。"
  },
  {
    number: 16, name: "豫", chinese: "雷地豫",
    trigrams: ["震", "坤"],
    nature: "雷地",
    symbol: "预备、欢乐",
    lines: [0, 1, 0, 0, 0, 0],
    interpretation: "豫卦象征预备与欢乐。雷出地奋，万物震动。预先准备则喜悦随之而来。",
    dataScience: "豫卦对应数据预处理与特征工程——充分的准备是后续分析成功的关键。"
  },
  {
    number: 17, name: "随", chinese: "泽雷随",
    trigrams: ["兑", "震"],
    nature: "泽雷",
    symbol: "随顺、追随",
    lines: [0, 1, 0, 1, 0, 0],
    interpretation: "随卦象征随顺与追随。泽中有雷，随风而动。随时而动，顺势而为。",
    dataScience: "随卦对应自适应学习率与在线学习——根据数据流的变化动态调整模型参数。"
  },
  {
    number: 18, name: "蛊", chinese: "山风蛊",
    trigrams: ["艮", "巽"],
    nature: "山风",
    symbol: "蛊惑、整治",
    lines: [0, 0, 0, 0, 1, 1],
    interpretation: "蛊卦象征整治与革新。山下有风，风行地上以振民。蛊则可治，败坏可兴。",
    dataScience: "蛊卦对应模型诊断与修复——识别并修正模型中的缺陷与偏差。"
  },
  {
    number: 19, name: "临", chinese: "地泽临",
    trigrams: ["坤", "兑"],
    nature: "地泽",
    symbol: "来临、监临",
    lines: [0, 0, 0, 0, 1, 0],
    interpretation: "临卦象征来临与统治。泽上有地，大者来临。君子以教思无穷。",
    dataScience: "临卦对应模型部署与监控——将训练好的模型部署到生产环境并持续监控其表现。"
  },
  {
    number: 20, name: "观", chinese: "风地观",
    trigrams: ["巽", "坤"],
    nature: "风地",
    symbol: "观察、观瞻",
    lines: [0, 0, 1, 0, 0, 0],
    interpretation: "观卦象征观察与观瞻。风行地上，无处不在。观之以道，察之以理。",
    dataScience: "观卦对应可解释性与可视化——通过观察数据分布和模型行为来理解其决策逻辑。"
  },
  {
    number: 21, name: "噬嗑", chinese: "火雷噬嗑",
    trigrams: ["离", "震"],
    nature: "火雷",
    symbol: "咬合、决断",
    lines: [1, 0, 0, 0, 1, 1],
    interpretation: "噬嗑卦象征咬合与决断。雷火相交，阴阳相搏。遇险能止，知难而退。",
    dataScience: "噬嗑卦对应异常检测与决策边界——识别数据中的异常点并做出正确分类决策。"
  },
  {
    number: 22, name: "贲", chinese: "山火贲",
    trigrams: ["艮", "离"],
    nature: "山火",
    symbol: "文饰、美化",
    lines: [0, 0, 0, 1, 0, 1],
    interpretation: "贲卦象征文饰与美化。山上有火，光明照山。饰之以文，润之以质。",
    dataScience: "贲卦对应数据可视化与特征呈现——以美观且信息丰富的方式展示数据洞察。"
  },
  {
    number: 23, name: "剥", chinese: "山地剥",
    trigrams: ["艮", "坤"],
    nature: "山地",
    symbol: "剥落、衰败",
    lines: [0, 0, 0, 0, 0, 1],
    interpretation: "剥卦象征剥落与衰败。山附于地，剥落殆尽。君子以厚下安宅。",
    dataScience: "剥卦对应模型的退化与过拟合——训练过度导致模型在训练集上表现好但泛化能力差。"
  },
  {
    number: 24, name: "复", chinese: "地雷复",
    trigrams: ["坤", "震"],
    nature: "地雷",
    symbol: "回复、复兴",
    lines: [0, 1, 0, 0, 0, 0],
    interpretation: "复卦象征回复与复兴。一阳生于五阴之下，阳气回归。君子以见善则迁。",
    dataScience: "复卦对应模型的重启与迁移学习——从预训练或先前状态恢复，继续学习新任务。"
  },
  {
    number: 25, name: "无妄", chinese: "天雷无妄",
    trigrams: ["乾", "震"],
    nature: "天雷",
    symbol: "无妄、真实",
    lines: [1, 0, 1, 1, 1, 1],
    interpretation: "无妄卦象征无妄与真实。天雷无妄，万物自然而真实。不妄为则无不利。",
    dataScience: "无妄卦对应数据的真实性与诚实建模——不伪造数据，不夸大模型能力，如实报告结果。"
  },
  {
    number: 26, name: "大畜", chinese: "山天大畜",
    trigrams: ["艮", "乾"],
    nature: "山天",
    symbol: "大畜、积蓄",
    lines: [0, 0, 0, 1, 1, 1],
    interpretation: "大畜卦象征大积蓄。山在天上，止而蓄之。君子以多识前言往行。",
    dataScience: "大畜卦对应大规模预训练——在海量数据上预训练模型，积蓄知识以备下游任务使用。"
  },
  {
    number: 27, name: "颐", chinese: "山雷颐",
    trigrams: ["艮", "震"],
    nature: "山雷",
    symbol: "颐养、养育",
    lines: [0, 1, 0, 0, 0, 0],
    interpretation: "颐卦象征颐养与养育。山上有雷，雷出山中。养正则正，养不正则邪。",
    dataScience: "颐卦对应数据质量与特征健康——确保输入数据的质量和特征的健康性，避免数据污染。"
  },
  {
    number: 28, name: "大过", chinese: "泽风大过",
    trigrams: ["兑", "巽"],
    nature: "泽风",
    symbol: "大过、栋梁",
    lines: [1, 0, 1, 1, 0, 1],
    interpretation: "大过卦象征大过与栋梁。泽上于风，栋桡矣。大人以栋梁而任天下之重。",
    dataScience: "大过卦对应模型的鲁棒性与泛化——在极端条件下仍能保持合理表现的模型。"
  },
  {
    number: 29, name: "坎", chinese: "坎为水",
    trigrams: ["坎", "坎"],
    nature: "重坎",
    symbol: "水、险、陷",
    lines: [0, 1, 0, 1, 0, 1],
    interpretation: "坎卦为重险之象，坎中有险，险中有险。君子以常德行，习教事。",
    dataScience: "坎卦对应数据中的噪声与不确定性——模型需要在充满噪声的环境中保持稳定。"
  },
  {
    number: 30, name: "离", chinese: "离为火",
    trigrams: ["离", "离"],
    nature: "重离",
    symbol: "火、明、附",
    lines: [1, 0, 1, 0, 1, 0],
    interpretation: "离卦为明照之象，离中有明，明中有附。大人以明照于四方。",
    dataScience: "离卦对应模型的可解释性与透明度——模型如明灯照四方，决策过程清晰可察。"
  },
  {
    number: 31, name: "咸", chinese: "泽山咸",
    trigrams: ["兑", "艮"],
    nature: "泽山",
    symbol: "感应、咸感",
    lines: [0, 1, 0, 0, 1, 0],
    interpretation: "咸卦象征感应与咸感。泽上有山，山泽通气。感应之道在于无心之感。",
    dataScience: "咸卦对应无监督学习中的特征关联——发现数据中隐藏的结构与关联模式。"
  },
  {
    number: 32, name: "恒", chinese: "雷风恒",
    trigrams: ["震", "巽"],
    nature: "雷风",
    symbol: "恒久、持久",
    lines: [0, 1, 0, 1, 0, 0],
    interpretation: "恒卦象征恒久与持久。雷风相随，恒久之道。君子以立不易方。",
    dataScience: "恒卦对应模型的稳定性与一致性——在多次运行中产生一致结果的可靠模型。"
  },
  {
    number: 33, name: "遁", chinese: "天山遁",
    trigrams: ["乾", "艮"],
    nature: "天山",
    symbol: "遁退、隐退",
    lines: [1, 1, 1, 0, 1, 1],
    interpretation: "遁卦象征遁退与隐退。天在上，山在下，山高而天更高。遁世无闷。",
    dataScience: "遁卦对应模型的早停与正则化——在适当时候停止训练以避免过拟合。"
  },
  {
    number: 34, name: "大壮", chinese: "雷天大壮",
    trigrams: ["震", "乾"],
    nature: "雷天",
    symbol: "大壮、强盛",
    lines: [0, 1, 0, 1, 1, 1],
    interpretation: "大壮卦象征大壮与强盛。雷在天上，声势浩大。君子以非礼弗履。",
    dataScience: "大壮卦对应模型的高置信度预测——在数据充足且特征清晰时的强预测能力。"
  },
  {
    number: 35, name: "晋", chinese: "火地晋",
    trigrams: ["离", "坤"],
    nature: "火地",
    symbol: "进长、晋升",
    lines: [1, 0, 1, 1, 1, 0],
    interpretation: "晋卦象征进长与晋升。火在地上，明照于地。晋康侯用锡马蕃庶。",
    dataScience: "晋卦对应模型的持续改进——通过迭代优化不断提升模型性能。"
  },
  {
    number: 36, name: "明夷", chinese: "地火明夷",
    trigrams: ["坤", "离"],
    nature: "地火",
    symbol: "明夷、光明受损",
    lines: [0, 1, 1, 0, 1, 0],
    interpretation: "明夷卦象征光明受损。地中有火，光明隐伏。君子以莅众，用晦而明。",
    dataScience: "明夷卦对应对抗样本与鲁棒性——模型在正常条件下表现良好，但在对抗扰动下失效。"
  },
  {
    number: 37, name: "家人", chinese: "风火家人",
    trigrams: ["巽", "离"],
    nature: "风火",
    symbol: "家人、家庭",
    lines: [0, 1, 0, 0, 1, 0],
    interpretation: "家人卦象征家庭与家人。风自火出，家风传承。君子以言有物而行有恒。",
    dataScience: "家人卦对应特征之间的内在关联——特征如同家庭成员，相互依存共同构成完整表示。"
  },
  {
    number: 38, name: "睽", chinese: "火泽睽",
    trigrams: ["离", "兑"],
    nature: "火泽",
    symbol: "睽异、对立",
    lines: [1, 0, 1, 0, 0, 1],
    interpretation: "睽卦象征睽异与对立。火在上，泽在下，两火相违。睽而能异，异而能和。",
    dataScience: "睽卦对应多任务学习中的冲突与协调——不同任务之间可能存在矛盾，需要找到平衡。"
  },
  {
    number: 39, name: "蹇", chinese: "山泽蹇",
    trigrams: ["艮", "兑"],
    nature: "山泽",
    symbol: "蹇难、蹇滞",
    lines: [0, 1, 0, 0, 1, 1],
    interpretation: "蹇卦象征蹇难与蹇滞。山上有泽，险在前而止。蹇之时用大矣哉。",
    dataScience: "蹇卦对应模型训练中的困难与瓶颈——梯度消失、局部最优等训练难题。"
  },
  {
    number: 40, name: "解", chinese: "雷水解",
    trigrams: ["震", "坎"],
    nature: "雷水",
    symbol: "解脱、化解",
    lines: [0, 1, 0, 0, 0, 0],
    interpretation: "解卦象征解脱与化解。雷水解，险以动，动而免乎险。君子以赦罪宥功。",
    dataScience: "解卦对应模型的故障恢复与容错——当模型遇到错误输入时能够优雅地恢复。"
  },
  {
    number: 41, name: "损", chinese: "山泽损",
    trigrams: ["艮", "兑"],
    nature: "山泽",
    symbol: "损减、减损",
    lines: [0, 1, 0, 0, 0, 0],
    interpretation: "损卦象征损减与减损。泽上有山，山高泽低。损下益上，损己利人。",
    dataScience: "损卦对应知识蒸馏与模型压缩——通过减少模型复杂度来提升效率。"
  },
  {
    number: 42, name: "益", chinese: "风雷益",
    trigrams: ["巽", "震"],
    nature: "风雷",
    symbol: "增益、利益",
    lines: [0, 1, 0, 1, 0, 0],
    interpretation: "益卦象征增益与利益。风雷相益，损上益下。君子以见善则迁，有过则改。",
    dataScience: "益卦对应模型的正则化增益——通过正则化项提升模型的泛化能力。"
  },
  {
    number: 43, name: "夬", chinese: "泽天夬",
    trigrams: ["兑", "乾"],
    nature: "泽天",
    symbol: "决断、夬决",
    lines: [1, 1, 1, 1, 0, 1],
    interpretation: "夬卦象征决断与夬决。泽上于天，阳气盛而阴欲决。扬于王庭，孚号有厉。",
    dataScience: "夬卦对应模型的决策边界与分类置信度——在边界模糊时做出果断的分类决策。"
  },
  {
    number: 44, name: "姤", chinese: "天风姤",
    trigrams: ["乾", "巽"],
    nature: "天风",
    symbol: "相遇、邂逅",
    lines: [1, 1, 1, 0, 1, 1],
    interpretation: "姤卦象征相遇与邂逅。天风姤，柔遇刚也。勿用取女，见金夫。",
    dataScience: "姤卦对应数据中的意外关联——在特征空间中发现的非预期但有意义的模式。"
  },
  {
    number: 45, name: "萃", chinese: "泽地萃",
    trigrams: ["兑", "坤"],
    nature: "泽地",
    symbol: "聚集、荟萃",
    lines: [0, 0, 1, 0, 0, 0],
    interpretation: "萃卦象征聚集与荟萃。泽上于地，水聚也。君子以除戎器，戒不虞。",
    dataScience: "萃卦对应数据聚类与样本聚合——将相似的数据点聚集在一起形成有意义的群组。"
  },
  {
    number: 46, name: "升", chinese: "地风升",
    trigrams: ["坤", "巽"],
    nature: "地风",
    symbol: "上升、升进",
    lines: [0, 0, 0, 0, 1, 0],
    interpretation: "升卦象征上升与升进。地中生木，升也。君子以顺德，积小以高大。",
    dataScience: "升卦对应模型的渐进式提升——通过逐步优化和迭代实现性能的持续上升。"
  },
  {
    number: 47, name: "困", chinese: "泽水困",
    trigrams: ["兑", "坎"],
    nature: "泽水",
    symbol: "困顿、困境",
    lines: [0, 1, 0, 0, 1, 0],
    interpretation: "困卦象征困顿与困境。泽无水，困也。君子以致命遂志。",
    dataScience: "困卦对应模型的资源受限场景——在计算或数据受限时仍需做出最佳预测。"
  },
  {
    number: 48, name: "井", chinese: "水风井",
    trigrams: ["坎", "巽"],
    nature: "水风",
    symbol: "井、源泉",
    lines: [0, 0, 1, 0, 1, 0],
    interpretation: "井卦象征井与源泉。井收勿幕，有孚元吉。改邑不改井。",
    dataScience: "井卦对应数据管道与特征存储——稳定、可复用的数据基础设施是所有分析的基础。"
  },
  {
    number: 49, name: "革", chinese: "泽火革",
    trigrams: ["兑", "离"],
    nature: "泽火",
    symbol: "变革、革新",
    lines: [0, 1, 0, 1, 0, 1],
    interpretation: "革卦象征变革与革新。泽中有火，革也。君子以治历明时。",
    dataScience: "革卦对应模型的版本迭代与架构变革——在适当时机进行模型重构与升级。"
  },
  {
    number: 50, name: "鼎", chinese: "火风鼎",
    trigrams: ["离", "巽"],
    nature: "火风",
    symbol: "鼎、革新",
    lines: [1, 0, 1, 0, 0, 0],
    interpretation: "鼎卦象征鼎与烹饪。木上有火，鼎也。君子以正位凝命。",
    dataScience: "鼎卦对应模型训练的核心过程——将原始数据转化为有价值的知识输出。"
  },
  {
    number: 51, name: "震", chinese: "震为雷",
    trigrams: ["震", "震"],
    nature: "重雷",
    symbol: "雷、动、惊",
    lines: [0, 1, 0, 0, 1, 0],
    interpretation: "震卦象征雷与震动。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。",
    dataScience: "震卦对应模型对分布外数据的响应——面对未知输入时的警觉与稳健应对。"
  },
  {
    number: 52, name: "艮", chinese: "艮为山",
    trigrams: ["艮", "艮"],
    nature: "重艮",
    symbol: "山、止、限",
    lines: [0, 0, 0, 1, 0, 0],
    interpretation: "艮卦象征山与止息。艮其背，不获其身。君子以思不出其位。",
    dataScience: "艮卦对应模型的停止条件与收敛——在适当的时候停止学习，保持当前状态。"
  },
  {
    number: 53, name: "渐", chinese: "风山渐",
    trigrams: ["巽", "艮"],
    nature: "风山",
    symbol: "渐进、渐长",
    lines: [0, 0, 0, 0, 1, 0],
    interpretation: "渐卦象征渐进与渐长。风山渐，循序渐进。鸿渐于陆，其羽可用为仪。",
    dataScience: "渐卦对应模型的渐进式训练——逐步增加数据量和模型复杂度，稳步提升性能。"
  },
  {
    number: 54, name: "归妹", chinese: "泽雷归妹",
    trigrams: ["兑", "震"],
    nature: "泽雷",
    symbol: "归妹、嫁娶",
    lines: [0, 1, 0, 1, 0, 0],
    interpretation: "归妹卦象征归妹与嫁娶。泽上有雷，雷归妹。归妹以娣，跛能履。",
    dataScience: "归妹卦对应多模态融合——将不同来源的数据（模态）整合为统一的表示。"
  },
  {
    number: 55, name: "丰", chinese: "雷火丰",
    trigrams: ["震", "离"],
    nature: "雷火",
    symbol: "丰盛、丰大",
    lines: [0, 1, 0, 1, 1, 1],
    interpretation: "丰卦象征丰盛与丰大。雷火交加，光明盛大。丰其蔀，日中见斗。",
    dataScience: "丰卦对应模型的高性能状态——在充足数据和良好特征下的丰盛预测能力。"
  },
  {
    number: 56, name: "旅", chinese: "火山旅",
    trigrams: ["离", "艮"],
    nature: "火山",
    symbol: "旅人、旅途",
    lines: [1, 0, 1, 1, 0, 0],
    interpretation: "旅卦象征旅人与旅途。火山旅，羁旅也。君子以明慎用刑而不留狱。",
    dataScience: "旅卦对应模型的跨域迁移——在不同数据分布之间旅行并保持泛化能力。"
  },
  {
    number: 57, name: "巽", chinese: "巽为风",
    trigrams: ["巽", "巽"],
    nature: "重巽",
    symbol: "风、顺、入",
    lines: [0, 1, 0, 1, 0, 0],
    interpretation: "巽卦象征风与顺入。巽为小，风为柔。君子以申命行事。",
    dataScience: "巽卦对应模型的灵活性与适应性——如风般随形就势，适应不同的数据分布。"
  },
  {
    number: 58, name: "兑", chinese: "兑为泽",
    trigrams: ["兑", "兑"],
    nature: "重兑",
    symbol: "泽、悦、说",
    lines: [0, 0, 1, 1, 0, 0],
    interpretation: "兑卦象征泽与喜悦。兑为说，悦也。君子以朋友讲习。",
    dataScience: "兑卦对应模型的友好交互与可解释输出——让用户愉悦地理解和使用模型。"
  },
  {
    number: 59, name: "涣", chinese: "风水涣",
    trigrams: ["巽", "坎"],
    nature: "风水",
    symbol: "涣散、消散",
    lines: [0, 1, 0, 0, 0, 0],
    interpretation: "涣卦象征涣散与消散。风水涣，涣也。君子以散则疑。",
    dataScience: "涣卦对应模型的过拟合与知识扩散——模型在训练集上过度学习导致泛化能力涣散。"
  },
  {
    number: 60, name: "节", chinese: "水泽节",
    trigrams: ["坎", "兑"],
    nature: "水泽",
    symbol: "节制、节度",
    lines: [0, 1, 0, 0, 1, 0],
    interpretation: "节卦象征节制与节度。水泽节，节以制度。君子以制数度，议德行。",
    dataScience: "节卦对应模型的正则化与约束——通过约束条件控制模型复杂度与行为。"
  },
  {
    number: 61, name: "中孚", chinese: "风泽中孚",
    trigrams: ["巽", "兑"],
    nature: "风泽",
    symbol: "中孚、信孚",
    lines: [0, 1, 0, 0, 0, 0],
    interpretation: "中孚卦象征中孚与信孚。泽上有风，中孚。豚鱼吉，利涉大川。",
    dataScience: "中孚卦对应模型的可信度评估——评估模型预测的置信度与可靠性。"
  },
  {
    number: 62, name: "小过", chinese: "雷山小过",
    trigrams: ["震", "艮"],
    nature: "雷山",
    symbol: "小过、小有过越",
    lines: [0, 1, 0, 0, 0, 0],
    interpretation: "小过卦象征小过与小有过越。雷山小过，弗过防之。飞鸟遗之音。",
    dataScience: "小过卦对应模型的微调与轻量优化——在预训练基础上进行小规模调整。"
  },
  {
    number: 63, name: "既济", chinese: "水火既济",
    trigrams: ["坎", "离"],
    nature: "水火",
    symbol: "既济、完成",
    lines: [0, 1, 0, 1, 0, 1],
    interpretation: "既济卦象征既济与完成。水在火上，事物完成。亨小，利贞。",
    dataScience: "既济卦对应模型的完成状态——训练收敛、性能达标、准备部署上线。"
  },
  {
    number: 64, name: "未济", chinese: "火水未济",
    trigrams: ["离", "坎"],
    nature: "火水",
    symbol: "未济、未完成",
    lines: [1, 0, 1, 0, 1, 0],
    interpretation: "未济卦象征未济与未完成。火在水上，事物未成。亨。小狐汔济。",
    dataScience: "未济卦对应模型的持续学习与在线更新——模型永远处于未完成状态，需要持续学习。"
  },
];

/* ===== 卦象工具函数 ===== */

/** 获取卦的阴阳线数组（从下到上） */
export function getHexagramLines(number: number): (0 | 1)[] {
  const hex = hexagrams.find((h) => h.number === number);
  return hex ? hex.lines : [0, 0, 0, 0, 0, 0];
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

/** 获取卦的"卦值"（二进制表示，lines[0]为最低位） */
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
