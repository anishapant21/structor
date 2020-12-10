import React from 'react';
import { IQuestionnaireItemType } from '../../types/IQuestionnareItemType';
import './Select.css';
import downArrow from '../../images/icons/chevron-down-outline.svg';

type Props = {
    options: {
        display: string;
        code: IQuestionnaireItemType | string;
    }[];
    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    value?: string;
    placeholder?: string;
};

const Select = ({ options, onChange, value, placeholder }: Props): JSX.Element => {
    return (
        <div className="selector">
            <select onChange={onChange} value={value}>
                {placeholder && (
                    <option value="" disabled selected>
                        {placeholder}
                    </option>
                )}
                {options.map((item, index) => (
                    <option key={index} value={item.code}>
                        {item.display}
                    </option>
                ))}
            </select>
            <img src={downArrow} height="25" />
        </div>
    );
};

export default Select;