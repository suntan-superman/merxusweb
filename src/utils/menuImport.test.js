import test from 'node:test';
import assert from 'node:assert/strict';

import { parseMenuCsv, toImportableMenuItems, validateMenuItems } from './menuImport.js';

test('menu CSV parser ignores empty physical rows and preserves quoted commas', () => {
  const items = parseMenuCsv(
    'name,description,price,category,isAvailable,tags,includedSides,extraChargeSides\r\n' +
      '\r\n' +
      'Tacos,"Beef, onion, cilantro",12.50,Entrees,TRUE,one side,Beans;Rice,Avocado:$2\r\n'
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].description, 'Beef, onion, cilantro');
  assert.deepEqual(items[0].includedSides, ['Beans', 'Rice']);
  assert.deepEqual(items[0].extraChargeSides, { Avocado: 2 });
  assert.equal(items[0].sideCount, 1);
});

test('menu validation reports missing prices instead of silently dropping rows', () => {
  const items = parseMenuCsv(
    'name,description,price,category,isAvailable,tags,includedSides,extraChargeSides\n' +
      'Bread Choice,Choose bread,,Modifiers,TRUE,,,\n'
  );
  const validation = validateMenuItems(items);
  assert.equal(items.length, 1);
  assert.equal(validation.validCount, 0);
  assert.equal(validation.hasErrors, true);
  assert.match(validation.errors[0], /Missing or invalid 'Price'/);
});

test('same names in different categories warn while exact duplicates fail', () => {
  const items = parseMenuCsv(
    'name,description,price,category,isAvailable,tags,includedSides,extraChargeSides\n' +
      'Lemon Drop,Cocktail,12,Cocktails,TRUE,,,\n' +
      'Lemon Drop,Shot,10,Shots,TRUE,,,\n' +
      'Lemon Drop,Duplicate,10,Shots,TRUE,,,\n'
  );
  const validation = validateMenuItems(items);
  assert.equal(validation.hasErrors, true);
  assert.match(validation.errors.join('\n'), /Duplicate item and category/);
  assert.match(validation.warnings.join('\n'), /Same item name appears in different categories/);
});

test('importable items exclude parser metadata', () => {
  const [item] = toImportableMenuItems(
    parseMenuCsv(
      'name,description,price,category,isAvailable,tags,includedSides,extraChargeSides\n' +
        'Coffee,Fresh coffee,3.5,Beverages,TRUE,,,\n'
    )
  );
  assert.equal(Object.hasOwn(item, 'sourceRow'), false);
  assert.equal(Object.hasOwn(item, 'columnCount'), false);
  assert.equal(item.price, 3.5);
});

