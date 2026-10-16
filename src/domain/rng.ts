/**
 * 可复现的伪随机数（mulberry32）。
 *
 * 旧实现用 Math.random 打乱顺序，同样配置两次生成结果不同、事后无法复现。
 * 这里把种子固定进排班表（ScheduleConfig.seed），同样的输入必然得到同样的排班。
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 把任意字符串稳定地折成一个 32 位种子（用于「按排班表 id 派生种子」） */
export function seedFromString(text: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

/** Fisher-Yates，返回新数组，不改动入参 */
export function shuffleWithRng<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
