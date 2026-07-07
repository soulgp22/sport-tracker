const headerAliases: Record<string, string> = {
  nom: 'name',
  name: 'name',
  aliment: 'name',
  categorie: 'category',
  category: 'category',
  unite: 'unit',
  unit: 'unit',
  calories: 'calories',
  kcal: 'calories',
  energie: 'calories',
  calorie: 'calories',
  proteines: 'protein',
  protein: 'protein',
  proteine: 'protein',
  glucides: 'carbs',
  carbs: 'carbs',
  carbohydrates: 'carbs',
  glucide: 'carbs',
  lipides: 'fat',
  fat: 'fat',
  lipide: 'fat',
  graisses: 'fat',
  fibres: 'fiber',
  fiber: 'fiber',
  fibre: 'fiber',
  sucre: 'sugar',
  sugar: 'sugar',
  sucres: 'sugar',
  sel: 'salt',
  salt: 'salt',
  id: 'id',
  identifiant: 'id',
};

const requiredColumns = ['name', 'category', 'calories', 'protein', 'carbs', 'fat'] as const;
const requiredNumberColumns = ['calories', 'protein', 'carbs', 'fat'] as const;
const optionalNumberColumns = ['fiber', 'sugar', 'salt'] as const;

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function slugify(value: string, lineNumber: number) {
  const slug = normalizeText(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return slug || `aliment_${lineNumber}`;
}

function parseCsvLine(line: string, separator: string) {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === separator && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  fields.push(current);
  return fields;
}

function parseNumber(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseFoodsCsv(text: string): { foods: unknown[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const errors: string[] = [];

  if (lines.length === 0) {
    return { foods: [], errors: ['Colonne requise manquante : name, category, calories, protein, carbs, fat'] };
  }

  const headerLine = lines[0];
  const separator = headerLine.includes(';') ? ';' : ',';
  const rawHeaders = parseCsvLine(headerLine, separator);
  const headers = rawHeaders.map((header) => headerAliases[normalizeText(header)] ?? null);
  const headerSet = new Set(headers.filter((header): header is string => header !== null));
  const missingColumns = requiredColumns.filter((column) => !headerSet.has(column));

  if (missingColumns.length > 0) {
    return { foods: [], errors: [`Colonne requise manquante : ${missingColumns.join(', ')}`] };
  }

  const foods: unknown[] = [];

  lines.slice(1).forEach((line, dataIndex) => {
    const lineNumber = dataIndex + 1;
    const fields = parseCsvLine(line, separator);
    const values: Record<string, string> = {};

    headers.forEach((header, index) => {
      if (header) {
        values[header] = fields[index] ?? '';
      }
    });

    const name = values.name?.trim() ?? '';
    const category = values.category?.trim() ?? '';
    const rowErrors: string[] = [];

    if (!name) {
      rowErrors.push(`Ligne ${lineNumber} : "name" est obligatoire.`);
    }

    if (!category) {
      rowErrors.push(`Ligne ${lineNumber} : "category" est obligatoire.`);
    }

    const nutritionPer100g: Record<string, number> = {};

    for (const column of requiredNumberColumns) {
      const parsed = parseNumber(values[column] ?? '');

      if (parsed === null) {
        rowErrors.push(`Ligne ${lineNumber} : "${column}" doit être un nombre.`);
      } else {
        nutritionPer100g[column] = parsed;
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    for (const column of optionalNumberColumns) {
      if (column in values) {
        const parsed = parseNumber(values[column] ?? '');
        if (parsed !== null) {
          nutritionPer100g[column] = parsed;
        }
      }
    }

    const rawUnit = values.unit?.trim();
    const unit = rawUnit ? (normalizeText(rawUnit) === 'unite' ? 'unité' : rawUnit) : 'g';
    const rawId = values.id?.trim();

    foods.push({
      id: rawId || slugify(name, lineNumber),
      name,
      category,
      unit,
      nutritionPer100g,
    });
  });

  return { foods, errors };
}
