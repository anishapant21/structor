import React, { useEffect } from 'react';
import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TreeContext } from '../../store/treeStore/treeStore';
import { generateQuestionnaireForPreview } from '../../helpers/generateQuestionnaire';
import { getLanguagesInUse, INITIAL_LANGUAGE } from '../../helpers/LanguageHelper';
import { ReferoContainer } from '@helsenorge/refero/components';
import { Store, createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import rootReducer from '@helsenorge/refero/reducers';
import Button from '@helsenorge/designsystem-react/components/Button';
import IconBtn from '../IconBtn/IconBtn';
import Select from '../Select/Select';
import { isItemControlReceiverComponent } from '../../helpers/itemControl';

import { referoTranslation } from '../../locales/nb-NO/referoTranslation';
import { Questionnaire } from '../../types/fhir';

type Props = {
    showFormFiller: () => void;
    language?: string;
};

// eslint-disable-next-line @typescript-eslint/ban-types
const store: Store<{}> = createStore(rootReducer, applyMiddleware(thunk));

const ReferoFiller = ({ showFormFiller, language }: Props): JSX.Element => {
    const { t } = useTranslation();
    const { state } = useContext(TreeContext);
    const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(
        language || state.qMetadata.language || INITIAL_LANGUAGE.code,
    );
    const [selectedGender, setSelectedGender] = useState<string>('');
    const [selectedAge, setSelectedAge] = useState<string>('');
    const languages = getLanguagesInUse(state);
    const [questionnaireForPreview, setQuestionnaireForPreview] = useState<Questionnaire>();

    useEffect(() => {
        setQuestionnaireForPreview(
            generateQuestionnaireForPreview(state, selectedLanguage, selectedGender, selectedAge),
        );
    }, [state, selectedLanguage, selectedGender, selectedAge]);

    function hasReceiverComponent(): boolean {
        return (
            Object.keys(state.qItems).filter((linkId) => isItemControlReceiverComponent(state.qItems[linkId])).length >
            0
        );
    }

    return (
        <Provider store={store}>
            <div className="overlay">
                <div className="iframe-div">
                    <div className="title align-everything">
                        <IconBtn type="x" title={t('Close')} onClick={showFormFiller} />
                        <h1>{t('Preview')}</h1>
                        <div className="pull-right">
                            {hasReceiverComponent() && (
                                <input
                                    style={{ padding: '0 10px', border: 0, width: 250 }}
                                    placeholder={t('Recipient component EndpointId')}
                                />
                            )}
                            <Select
                                value={selectedGender}
                                options={[
                                    {
                                        code: '',
                                        display: t('Gender'),
                                    },
                                    {
                                        code: 'Kvinne',
                                        display: t('Female'),
                                    },
                                    {
                                        code: 'Mann',
                                        display: t('Male'),
                                    },
                                    {
                                        code: 'Ukjent',
                                        display: t('Unknown'),
                                    },
                                ]}
                                onChange={(e) => {
                                    setSelectedGender(e.target.value);
                                }}
                                compact={true}
                            />
                            <Select
                                value={selectedAge}
                                options={[
                                    {
                                        code: '',
                                        display: t('Age'),
                                    },
                                    ...Array.from(Array(120), (_x, index) => {
                                        return {
                                            code: index.toString(),
                                            display: index.toString(),
                                        };
                                    }),
                                ]}
                                onChange={(e) => {
                                    setSelectedAge(e.target.value);
                                }}
                                compact={true}
                            />
                            <Select
                                value={selectedLanguage}
                                options={languages}
                                onChange={(e) => {
                                    setSelectedLanguage(e.target.value);
                                }}
                                compact={true}
                            />
                        </div>
                    </div>
                    <div style={{ padding: '20px' }} className="test">
                        <ReferoContainer
                            store={store}
                            questionnaire={questionnaireForPreview}
                            onCancel={showFormFiller}
                            onSave={console.log('save')}
                            onSubmit={console.log('submit')}
                            authorized={false}
                            resources={referoTranslation}
                            loginButton={<Button>{referoTranslation.skjemaLoginButton}</Button>}
                            validateScriptInjection
                            sticky
                        />
                    </div>
                </div>
            </div>
        </Provider>
    );
};

export default ReferoFiller;