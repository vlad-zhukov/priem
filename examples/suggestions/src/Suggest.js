import React from 'react';
import Autosuggest from 'react-autosuggest';
import {Priem, Container} from 'priem';

const suggestions = new Container({
    mapPropsToArgs: ({value}) => (value === '' ? null : [value]),
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

export default class Suggest extends React.Component {
    constructor() {
        super();
        this.state = {value: ''};
    }

    onChange = (event, {newValue}) => {
        this.setState({value: newValue});
    };

    render() {
        const {value} = this.state;

        return (
            <Priem sources={{suggestions}} value={value}>
                {props => {
                    let suggestions = [];
                    if (props.suggestions && props.suggestions.data) {
                        suggestions = props.suggestions.data;
                    }
                    return (
                        <Autosuggest
                            suggestions={suggestions}
                            getSuggestionValue={getSuggestionValue}
                            renderSuggestion={renderSuggestion}
                            inputProps={{value, onChange: this.onChange, placeholder: 'Input something'}}
                            onSuggestionsFetchRequested={noop}
                            onSuggestionsClearRequested={noop}
                        />
                    );
                }}
            </Priem>
        );
    }
}
