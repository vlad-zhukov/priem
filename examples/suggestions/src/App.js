import React from 'react';
import Autosuggest from 'react-autosuggest';
import {createResource} from 'priem';

const useSuggestions = createResource(
    ({value}) =>
        fetch('https://jsonplaceholder.typicode.com/photos')
            .then(res => res.json())
            .then(res => res.filter(item => item.title && item.title.includes(value)).slice(0, 5))
            .then(res => {
                console.log(res);
            }),
    {maxSize: 10},
);

const getSuggestionValue = suggestion => (suggestion ? suggestion.value : null);

const renderSuggestion = suggestion => (suggestion ? <div>{suggestion.title}</div> : null);

const noop = () => {};

export default function App() {
    const [value, setValue] = React.useState('');
    const [suggestions] = useSuggestions(value === '' ? undefined : {value});

    return (
        <>
            <Autosuggest
                suggestions={suggestions || []}
                getSuggestionValue={getSuggestionValue}
                renderSuggestion={renderSuggestion}
                inputProps={{value, onChange: (e, {newValue}) => setValue(newValue), placeholder: 'Input something'}}
                onSuggestionsFetchRequested={noop}
                onSuggestionsClearRequested={noop}
            />
            <button onClick={() => setValue('')}>click</button>
        </>
    );
}
