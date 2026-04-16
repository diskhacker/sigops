import chalk from 'chalk';

export const log = {
  info: (msg: string) => console.log(chalk.cyan('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  error: (msg: string) => console.error(chalk.red('✗'), msg),
  dim: (msg: string) => console.log(chalk.dim(msg)),
  bold: (msg: string) => console.log(chalk.bold(msg)),
  task: (name: string, desc?: string) =>
    console.log(`  ${chalk.bold.white(name)}  ${chalk.dim(desc || '')}`),
  header: (msg: string) => {
    console.log('');
    console.log(chalk.bold.underline(msg));
    console.log('');
  },
  table: (rows: string[][]) => {
    if (rows.length === 0) return;
    const colWidths = rows[0].map((_, ci) =>
      Math.max(...rows.map(r => (r[ci] || '').length))
    );
    for (const row of rows) {
      console.log(
        '  ' + row.map((cell, ci) => cell.padEnd(colWidths[ci] + 2)).join('')
      );
    }
  },
  divider: () => console.log(chalk.dim('─'.repeat(60))),
};
