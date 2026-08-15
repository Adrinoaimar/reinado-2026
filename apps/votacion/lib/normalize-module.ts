const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  primer: 1,
  primero: 1,
  primera: 1,
  dos: 2,
  segundo: 2,
  segunda: 2,
  tres: 3,
  tercer: 3,
  tercero: 3,
  tercera: 3,
  cuatro: 4,
  cuarto: 4,
  cuarta: 4,
  cinco: 5,
  quinto: 5,
  quinta: 5,
  seis: 6,
  sexto: 6,
  sexta: 6,
  siete: 7,
  septimo: 7,
  septima: 7,
  ocho: 8,
  octavo: 8,
  octava: 8,
  nueve: 9,
  noveno: 9,
  novena: 9,
  diez: 10,
  decimo: 10,
  decima: 10
};

const ROMAN_VALUES: Array<[number, string]> = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
];

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function toRoman(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 3999) return null;
  let remainder = value;
  let result = "";
  for (const [amount, symbol] of ROMAN_VALUES) {
    while (remainder >= amount) {
      result += symbol;
      remainder -= amount;
    }
  }
  return result;
}

function fromRoman(value: string) {
  const roman = value.toUpperCase();
  if (!/^[IVXLCDM]+$/.test(roman)) return null;
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let index = 0; index < roman.length; index += 1) {
    const current = values[roman[index] ?? ""] ?? 0;
    const next = values[roman[index + 1] ?? ""] ?? 0;
    total += current < next ? -current : current;
  }
  return toRoman(total) === roman ? total : null;
}

function parseNumber(value: string) {
  if (/^\d+$/.test(value)) return Number(value);
  return NUMBER_WORDS[stripAccents(value)] ?? fromRoman(value);
}

const WORD = "[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+";

export function normalizeModuleReferences(value: string) {
  const numberBeforeModule = new RegExp(`\\b(\\d{1,3})(?:er|ro|do|to)?\\s+(?:m[oó]dulo)\\b`, "gi");
  const wordBeforeModule = new RegExp(`\\b(${WORD})\\s+(?:m[oó]dulo)\\b`, "gi");
  const numberAfterModule = new RegExp(`\\b(?:m[oó]dulo)(?:\\s+(?:n[úu]mero|nro\\.?|n[°º]))?\\s*[:#-]?\\s*(\\d{1,3}|${WORD})\\b`, "gi");

  return value
    .replace(numberBeforeModule, (match, number: string) => {
      const roman = toRoman(Number(number));
      return roman ? roman : match;
    })
    .replace(wordBeforeModule, (match, word: string) => {
      const number = parseNumber(word);
      const roman = number ? toRoman(number) : null;
      return roman ? roman : match;
    })
    .replace(numberAfterModule, (match, rawNumber: string) => {
      const number = parseNumber(rawNumber);
      const roman = number ? toRoman(number) : null;
      return roman ? roman : match;
    })
    .replace(/\bm[oó]dulo\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}
