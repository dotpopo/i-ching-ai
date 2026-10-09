#!/usr/bin/env node
/* ============================================================
   六十四卦结构校验（零依赖）
   ============================================================

   用法：
     npm run verify:hexagrams          校验，失败即非零退出
     npm run verify:hexagrams -- --print   额外打印 64 行对照表

   为什么不用 Vitest：
     这个校验不需要 mock、不需要断言库、不需要 watch。
     为了一个纯数据结构检查往仓库里装一套测试框架，收益不划算。
     用 Node 自带的类型剥离直接 import src/data.ts，零依赖跑得动。

   为什么需要一个「独立基准表」：
     如果用 data.ts 自己生成期望值再去测 data.ts，等于自己批自己的卷子，
     错了也测不出来。所以下面 REF 是一份单独手写的基准表，
     并且用三条互相独立的规律去交叉验证它本身：

       1. 卦名 ↔ 卦序（REF 的 name 列对 64 个通行卦名）
       2. 六爻唯一性（2^6 = 64 种结构必须各出现一次）
       3. 文王卦序配对规律（第 2k-1 与第 2k 卦互为「倒置」或「阴阳互换」）

     三条规律只要有一条对不上，就说明基准表本身写错了，脚本同样报错。
     这样基准表不是「我说它对」，而是被结构性事实约束住的。

   注意：本脚本只校验「卦象结构」（卦序 / 卦名 / 上下卦 / 六爻 / Unicode 卦符），
   不校验卦辞、爻辞、解读文案。文案属于另一层，需要版本与校订来源才能判定。
   ============================================================ */

import { hexagrams, TRIGRAMS, linesFromTrigrams, trigramsFromLines, hexagramGlyph } from '../src/data.ts';

/* ---------- 独立基准表：卦序 卦名 上卦 下卦 ---------- */
const REF = `
1 乾 乾 乾
2 坤 坤 坤
3 屯 坎 震
4 蒙 艮 坎
5 需 坎 乾
6 讼 乾 坎
7 师 坤 坎
8 比 坎 坤
9 小畜 巽 乾
10 履 乾 兑
11 泰 坤 乾
12 否 乾 坤
13 同人 乾 离
14 大有 离 乾
15 谦 坤 艮
16 豫 震 坤
17 随 兑 震
18 蛊 艮 巽
19 临 坤 兑
20 观 巽 坤
21 噬嗑 离 震
22 贲 艮 离
23 剥 艮 坤
24 复 坤 震
25 无妄 乾 震
26 大畜 艮 乾
27 颐 艮 震
28 大过 兑 巽
29 坎 坎 坎
30 离 离 离
31 咸 兑 艮
32 恒 震 巽
33 遁 乾 艮
34 大壮 震 乾
35 晋 离 坤
36 明夷 坤 离
37 家人 巽 离
38 睽 离 兑
39 蹇 坎 艮
40 解 震 坎
41 损 艮 兑
42 益 巽 震
43 夬 兑 乾
44 姤 乾 巽
45 萃 兑 坤
46 升 坤 巽
47 困 兑 坎
48 井 坎 巽
49 革 兑 离
50 鼎 离 巽
51 震 震 震
52 艮 艮 艮
53 渐 巽 艮
54 归妹 震 兑
55 丰 震 离
56 旅 离 艮
57 巽 巽 巽
58 兑 兑 兑
59 涣 巽 坎
60 节 坎 兑
61 中孚 巽 兑
62 小过 震 艮
63 既济 坎 离
64 未济 离 坎
`.trim().split('\n').map((line) => {
  const [number, name, upper, lower] = line.trim().split(/\s+/);
  return { number: Number(number), name, upper, lower };
});

/* ---------- 迷你断言 ---------- */
const failures = [];
let checks = 0;

function ok(label, cond, detail) {
  checks += 1;
  if (!cond) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

function eq(label, actual, expected) {
  ok(label, actual === expected, `期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
}

/* ---------- 结构工具 ---------- */
const bits = (lines) => lines.join('');

/** 倒置（综卦）：整卦上下翻转 */
const invert = (lines) => [...lines].reverse();

/** 阴阳互换（错卦） */
const complement = (lines) => lines.map((l) => (l === 1 ? 0 : 1));

/** 自倒置的卦（倒过来还是自己），只有这 8 个 */
const SELF_INVERSE = new Set([1, 2, 27, 28, 29, 30, 61, 62]);

const byNumber = new Map(hexagrams.map((h) => [h.number, h]));

/* ============================================================
   测试 1：基准表自身合法（卦序 1..64 不缺失不重复）
   ============================================================ */
eq('T1 基准表条数', REF.length, 64);
eq('T1 基准表卦序', REF.map((r) => r.number).join(','), Array.from({ length: 64 }, (_, i) => i + 1).join(','));

/* ============================================================
   测试 2：应用数据的卦序 / 卦名 / 上下卦 与基准表逐条一致
   ============================================================ */
eq('T2 卦条数', hexagrams.length, 64);
eq('T2 卦序', hexagrams.map((h) => h.number).join(','), Array.from({ length: 64 }, (_, i) => i + 1).join(','));

for (const ref of REF) {
  const hex = byNumber.get(ref.number);
  if (!hex) { ok(`T2 #${ref.number}`, false, '应用数据里找不到这一卦'); continue; }
  eq(`T2 #${ref.number} 卦名`, hex.name, ref.name);
  eq(`T2 #${ref.number} 上卦`, hex.upper, ref.upper);
  eq(`T2 #${ref.number} 下卦`, hex.lower, ref.lower);
  eq(`T2 #${ref.number} trigrams`, hex.trigrams.join('/'), `${ref.upper}/${ref.lower}`);
}

/* ============================================================
   测试 3：上下卦 ↔ 六爻 双向一致（应用数据内部自洽）
   ============================================================ */
for (const hex of hexagrams) {
  const derived = linesFromTrigrams(hex.upper, hex.lower);
  eq(`T3 #${hex.number} 六爻由上下卦推出`, bits(hex.lines), bits(derived));

  const [u, l] = trigramsFromLines(hex.lines);
  eq(`T3 #${hex.number} 六爻反推上卦`, u, hex.upper);
  eq(`T3 #${hex.number} 六爻反推下卦`, l, hex.lower);
}

/* ============================================================
   测试 4：64 种六爻结构不重复，且 8×8 上下卦组合各出现一次
   ============================================================ */
const patterns = new Set(hexagrams.map((h) => bits(h.lines)));
eq('T4 六爻结构种类数', patterns.size, 64);

const combos = new Set(hexagrams.map((h) => `${h.upper}${h.lower}`));
eq('T4 上下卦组合种类数', combos.size, 64);

const trigramNames = Object.keys(TRIGRAMS);
eq('T4 八卦数', trigramNames.length, 8);
for (const u of trigramNames) {
  for (const l of trigramNames) {
    ok(`T4 组合 ${u}上${l}下 存在`, combos.has(`${u}${l}`), '缺少这一组合');
  }
}

/* ============================================================
   测试 5：文王卦序配对规律
   第 2k-1 与第 2k 卦：自倒置的 8 卦用「阴阳互换」，其余用「倒置」
   ============================================================ */
for (let k = 1; k <= 32; k += 1) {
  const a = byNumber.get(2 * k - 1);
  const b = byNumber.get(2 * k);
  const expect = SELF_INVERSE.has(a.number) ? complement(a.lines) : invert(a.lines);
  eq(`T5 第 ${a.number}/${b.number} 卦配对`, bits(b.lines), bits(expect));
}

// 自倒置的卦必须恰好是那 8 个，不能多也不能少
const actualSelfInverse = hexagrams
  .filter((h) => bits(invert(h.lines)) === bits(h.lines))
  .map((h) => h.number);
eq('T5 自倒置卦集合', actualSelfInverse.join(','), [...SELF_INVERSE].join(','));

/* ============================================================
   测试 6：派生展示字段（卦名全称 / 卦性 / Unicode 卦符）
   ============================================================ */
for (const hex of hexagrams) {
  const isPure = hex.upper === hex.lower;
  const upperNature = TRIGRAMS[hex.upper].nature;
  const lowerNature = TRIGRAMS[hex.lower].nature;

  eq(
    `T6 #${hex.number} 卦名全称`,
    hex.chinese,
    isPure ? `${hex.name}为${upperNature}` : `${upperNature}${lowerNature}${hex.name}`
  );

  const expectNature = isPure
    ? (hex.name === '乾' ? '纯阳' : hex.name === '坤' ? '纯阴' : `重${hex.name}`)
    : `${upperNature}${lowerNature}`;
  eq(`T6 #${hex.number} 卦性`, hex.nature, expectNature);

  eq(`T6 #${hex.number} Unicode 卦符`, hex.glyph, hexagramGlyph(hex.number));

  const cp = hex.glyph.codePointAt(0);
  ok(
    `T6 #${hex.number} 卦符落在 U+4DC0–U+4DFF`,
    cp >= 0x4dc0 && cp <= 0x4dff,
    `码位 U+${cp.toString(16).toUpperCase()}`
  );
  eq(`T6 #${hex.number} 卦符码位偏移`, cp - 0x4dc0, hex.number - 1);
}

/* ============================================================
   测试 7：内容层完整（每卦都有取象 / 古义 / 数据科学文案）
   ============================================================ */
for (const hex of hexagrams) {
  ok(`T7 #${hex.number} 取象非空`, hex.symbol.trim().length > 0);
  ok(`T7 #${hex.number} 古义非空`, hex.interpretation.trim().length > 0);
  ok(`T7 #${hex.number} 数据科学非空`, hex.dataScience.trim().length > 0);
}

/* ---------- 可选：打印 64 行对照表 ---------- */
if (process.argv.includes('--print')) {
  console.log('\n卦序  卦符  卦名      卦名全称    上下卦        六爻（自下而上）');
  console.log('─'.repeat(72));
  for (const hex of hexagrams) {
    const lines = hex.lines.map((l) => (l === 1 ? '▅▅▅' : '▅ ▅')).join(' ');
    const tri = `${TRIGRAMS[hex.upper].glyph}上${TRIGRAMS[hex.lower].glyph}下`;
    console.log(
      `${String(hex.number).padStart(3)}  ${hex.glyph}   ${hex.name.padEnd(6, '　')}  ` +
      `${hex.chinese.padEnd(8, '　')}  ${tri}   ${lines}`
    );
  }
  console.log('');
}

/* ---------- 汇总 ---------- */
if (failures.length === 0) {
  console.log(`✅ 六十四卦结构校验通过：${checks} 项断言全部成立`);
  process.exit(0);
}

console.error(`❌ 六十四卦结构校验失败：${failures.length} / ${checks} 项断言不成立\n`);
for (const f of failures.slice(0, 40)) console.error(`   · ${f}`);
if (failures.length > 40) console.error(`   …另有 ${failures.length - 40} 项`);
process.exit(1);
