import React from 'react';

type PickerProps = {
    value: string;
    onChange: (value: string) => void;
    options: string[];
};

const Picker: React.FunctionComponent<PickerProps> = ({value, onChange, options}) => (
    <span>
        <h1>{value}</h1>
        <select onChange={e => onChange(e.target.value)} value={value}>
            {options.map(option => (
                <option value={option} key={option}>
                    {option}
                </option>
            ))}
        </select>
    </span>
);

export default Picker;
