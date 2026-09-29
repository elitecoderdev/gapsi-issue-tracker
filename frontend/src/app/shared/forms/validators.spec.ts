import { FormControl } from '@angular/forms';
import { notBlank } from './validators';

describe('notBlank', () => {
  it.each([null, '', 'text', '  padded  '])('accepts %o', (value) => {
    expect(notBlank(new FormControl<string | null>(value))).toBeNull();
  });

  it('rejects whitespace-only values', () => {
    expect(notBlank(new FormControl('   '))).toEqual({ whitespace: true });
  });
});
