import { GENDER_RADIO_OPTIONS } from '../utils/genderOptions';

export default function GenderRadioGroup({
  name = 'gender',
  value,
  onChange,
  includeNone = true,
  className = '',
}) {
  const options = includeNone
    ? GENDER_RADIO_OPTIONS
    : GENDER_RADIO_OPTIONS.filter((option) => option.value !== 'none');

  return (
    <div className={`gender-radio-group ${className}`.trim()} role="radiogroup" aria-label="Gender">
      {options.map((option) => (
        <label key={option.value} className="gender-radio-option">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
