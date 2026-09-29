export type EquationPart = { text: string; sub?: string; sup?: string }

export type Question = {
  id: string
  parts: EquationPart[]
  prompt: string
  options: string[]
  answer: number
  concept: string
  hint: string
}

export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    parts: [{ text: 'log', sub: '2' }, { text: '(8)' }],
    prompt: 'Nilai dari log₂(8) adalah …',
    options: ['2', '3', '4', '8'],
    answer: 1,
    concept: 'Definisi logaritma',
    hint: 'Cari pangkat 2 yang menghasilkan 8.',
  },
  {
    id: 'q2',
    parts: [{ text: 'log', sub: '3' }, { text: '(81)' }],
    prompt: 'Nilai dari log₃(81) adalah …',
    options: ['3', '4', '9', '27'],
    answer: 1,
    concept: 'Definisi logaritma',
    hint: '3⁴ = 81.',
  },
  {
    id: 'q3',
    parts: [{ text: 'log', sub: '2' }, { text: '(8) + log', sub: '2' }, { text: '(4)' }],
    prompt: 'Tentukan nilai log₂(8) + log₂(4).',
    options: ['4', '5', '6', '8'],
    answer: 2,
    concept: 'Penjumlahan logaritma',
    hint: 'Hitung setiap logaritma terlebih dahulu.',
  },
  {
    id: 'q4',
    parts: [{ text: 'log', sub: '5' }, { text: '(125) − log', sub: '5' }, { text: '(5)' }],
    prompt: 'Tentukan nilai log₅(125) − log₅(5).',
    options: ['1', '2', '3', '4'],
    answer: 1,
    concept: 'Pengurangan logaritma',
    hint: '125 = 5³ dan 5 = 5¹.',
  },
  {
    id: 'q5',
    parts: [{ text: 'log', sub: '4' }, { text: '(64)' }],
    prompt: 'Nilai dari log₄(64) adalah …',
    options: ['2', '3', '4', '16'],
    answer: 1,
    concept: 'Basis dan pangkat',
    hint: '64 = 4³.',
  },
  {
    id: 'q6',
    parts: [{ text: 'log', sub: '2' }, { text: '(1/8)' }],
    prompt: 'Nilai dari log₂(1/8) adalah …',
    options: ['−3', '−2', '2', '3'],
    answer: 0,
    concept: 'Eksponen negatif',
    hint: '1/8 = 2⁻³.',
  },
  {
    id: 'q7',
    parts: [{ text: 'log', sub: '10' }, { text: '(1000)' }],
    prompt: 'Nilai dari log₁₀(1000) adalah …',
    options: ['1', '2', '3', '10'],
    answer: 2,
    concept: 'Logaritma basis 10',
    hint: '1000 = 10³.',
  },
  {
    id: 'q8',
    parts: [{ text: 'log', sub: '2' }, { text: '(32) − log', sub: '2' }, { text: '(4)' }],
    prompt: 'Tentukan nilai log₂(32) − log₂(4).',
    options: ['2', '3', '4', '5'],
    answer: 1,
    concept: 'Sifat selisih logaritma',
    hint: '32 = 2⁵ dan 4 = 2².',
  },
  {
    id: 'q9',
    parts: [{ text: 'log', sub: '2' }, { text: '(16 × 8)' }],
    prompt: 'Nilai dari log₂(16 × 8) adalah …',
    options: ['5', '6', '7', '8'],
    answer: 2,
    concept: 'Sifat logaritma perkalian',
    hint: '16 × 8 = 128 = 2⁷.',
  },
  {
    id: 'q10',
    parts: [{ text: 'log', sub: '3' }, { text: '(1/27)' }],
    prompt: 'Nilai dari log₃(1/27) adalah …',
    options: ['−4', '−3', '3', '4'],
    answer: 1,
    concept: 'Eksponen negatif',
    hint: '1/27 = 3⁻³.',
  },
]

export function shuffle<T>(items: T[], seed = Math.random()) {
  const copy = [...items]
  let state = Math.floor(seed * 2_147_483_647) || 1
  for (let i = copy.length - 1; i > 0; i -= 1) {
    state = (state * 16_807) % 2_147_483_647
    const j = state % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

