export function cleanBalance(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  let str = String(value).trim();

  str = str.replace(/Ksh/gi, '').trim();

  str = str.replace(/[^0-9.-]/g, '');

  const num = parseFloat(str);

  return isNaN(num) ? 0 : Math.round(num);
}