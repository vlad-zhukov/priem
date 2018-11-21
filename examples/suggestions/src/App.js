import React from 'react';
import Autosuggest from 'react-autosuggest';
import {usePriem, Container} from 'priem';

const suggestions = new Container({
    promise: value =>
        fetch('https://jsonplaceholder.typicode.com/photos')
            .then(res => res.json())
            .then(res => res.filter(item => item.title && item.title.includes(value)).slice(0, 5))
            .then(res => {
                console.log(res);
                return res;
            }),
    maxSize: 10,
});

const getSuggestionValue = suggestion => (suggestion ? suggestion.value : null);

const renderSuggestion = suggestion => (suggestion ? <div>{suggestion.title}</div> : null);

const noop = () => {};

export default function App() {
    const [value, setValue] = React.useState('');
    const {data} = usePriem(suggestions, value === '' ? null : [value]);

    return (
        <>
            <Autosuggest
                suggestions={data || []}
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
