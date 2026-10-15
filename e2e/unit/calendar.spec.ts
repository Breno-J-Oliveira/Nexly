import { expect, test } from '@playwright/test';
import {
  inicioDaSemana,
  limitesCalendario,
  organizarHorarios,
} from '../../apps/web/src/lib/calendar';

test('week starts on Monday and retains local day boundaries', () => {
  const day = new Date(2026, 9, 15, 23, 45);
  expect(inicioDaSemana(day).getDay()).toBe(1);
  expect(inicioDaSemana(day).getDate()).toBe(12);
  const range = limitesCalendario(day);
  expect(new Date(range.inicio).getHours()).toBe(0);
  expect(new Date(range.fim).getHours()).toBe(23);
  expect(new Date(range.fim).getDate()).toBe(day.getDate());
});

test('overlapping appointments stay in distinct columns and reuse a released column', () => {
  const item = (id: string, start: string, end: string) => ({
    id,
    dataHora: `2026-10-15T${start}:00Z`,
    dataHoraFim: `2026-10-15T${end}:00Z`,
  });
  const result = organizarHorarios([
    item('a', '10:00', '11:00'),
    item('b', '10:30', '12:00'),
    item('c', '11:00', '11:30'),
    item('d', '12:00', '12:30'),
  ]);
  expect(result.map((value) => [value.item.id, value.coluna, value.colunas])).toEqual([
    ['a', 0, 2],
    ['b', 1, 2],
    ['c', 0, 2],
    ['d', 0, 1],
  ]);
});
