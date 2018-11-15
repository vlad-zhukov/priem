import React from 'react';

const Picker = ({value, onChange, options}) => (
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
