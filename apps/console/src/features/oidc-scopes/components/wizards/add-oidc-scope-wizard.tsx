/**
 * Copyright (c) 2020, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { getAllExternalClaims } from "@wso2is/core/api";
import { AlertLevels, ExternalClaim, TestableComponentInterface } from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import { useTrigger } from "@wso2is/forms";
import { Heading, LinkButton, PrimaryButton, Steps } from "@wso2is/react-components";
import React, { FunctionComponent, ReactElement, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Grid, Icon, Modal } from "semantic-ui-react";
import { AddOIDCScopeForm } from "./add-oidc-scope-form";
import { OIDCScopeAttributesList } from "./oidc-scope-attribute-list";
import { createOIDCScope } from "../../api";
import { OIDCScopeWizardStepIcons } from "../../configs";
import { OIDCScopesManagementConstants } from "../../constants";
import { OIDCScopesListInterface } from "../../models";

/**
 * Interface for the wizard state.
 */
interface WizardStateInterface {
    [ key: string ]: any;
}

/**
 * Enum for wizard steps form types.
 * @readonly
 * @enum {string}
 */
enum WizardStepsFormTypes {
    BASIC_DETAILS = "BasicDetails",
    CLAIM_LIST= "ClaimList"
}

/**
 * Interface for the OIDC scope create wizard props.
 */
interface OIDCScopeCreateWizardPropsInterface extends TestableComponentInterface {
    closeWizard: () => void;
    currentStep?: number;
    onUpdate: () => void;
}

/**
 * OIDC scope create wizard component.
 *
 * @param {OIDCScopeCreateWizardPropsInterface} props - Props injected to the component.
 * @return {ReactElement}
 */
export const OIDCScopeCreateWizard: FunctionComponent<OIDCScopeCreateWizardPropsInterface> = (
    props: OIDCScopeCreateWizardPropsInterface): ReactElement => {

    const {
        closeWizard,
        currentStep,
        onUpdate,
        [ "data-testid" ]: testId
    } = props;

    const { t } = useTranslation();

    const dispatch = useDispatch();

    const [ finishSubmit, setFinishSubmit ] = useTrigger();
    const [ submitGeneralDetails, setSubmitGeneralDetails ] = useTrigger();

    const [ partiallyCompletedStep, setPartiallyCompletedStep ] = useState<number>(undefined);
    const [ currentWizardStep, setCurrentWizardStep ] = useState<number>(currentStep);
    const [ wizardState, setWizardState ] = useState<WizardStateInterface>(undefined);

    const [ OIDCAttributes, setOIDCAttributes ] = useState<ExternalClaim[]>(undefined);
    const [ selectedAttributes, setSelectedAttributes ] = useState<ExternalClaim[]>([]);
    const [ filterSelectedClaims, setFilterSelectedClaims ] = useState<ExternalClaim[]>([]);
    const [ selectedClaims, setSelectedClaims ] = useState<ExternalClaim[]>([]);
    const [ showSelectionModal, setShowSelectionModal ] = useState<boolean>(false);
    const [ isClaimRequestLoading, setIsClaimRequestLoading ] = useState<boolean>(false);

    useEffect(() => {
        if (OIDCAttributes) {
            return;
        }
        const OIDCAttributeId = OIDCScopesManagementConstants.OIDC_ATTRIBUTE_ID;
        getOIDCAttributes(OIDCAttributeId);
    }, [ OIDCAttributes ] );

    const getOIDCAttributes = (claimId: string) => {
        getAllExternalClaims(claimId, null)
            .then((response) => {
                setIsClaimRequestLoading(true);
                setOIDCAttributes(response);
            })
            .catch((error) => {
                if (error.response && error.response.data && error.response.data.description) {
                    dispatch(addAlert({
                        description: error.response.data.description,
                        level: AlertLevels.ERROR,
                        message: t("devPortal:components.oidcScopes.notifications.fetchOIDClaims.error" +
                            ".message")
                    }));

                    return;
                }
                dispatch(addAlert({
                    description: t("devPortal:components.oidcScopes.notifications.fetchOIDClaims" +
                        ".genericError.description"),
                    level: AlertLevels.ERROR,
                    message: t("devPortal:components.oidcScopes.notifications.fetchOIDClaims.genericError" +
                        ".message")
                }));
            })
            .finally(() => {
                setIsClaimRequestLoading(false);
            });
    };

    const navigateToNext = () => {
        switch (currentWizardStep) {
            case 0:
                setSubmitGeneralDetails();
                break;
            case 1:
                setFinishSubmit();
        }
    };

    const navigateToPrevious = () => {
        setPartiallyCompletedStep(currentWizardStep);
    };

    /**
     * Handles wizard step submit.
     *
     * @param values - Forms values to be stored in state.
     * @param {WizardStepsFormTypes} formType - Type of the form.
     */
    const handleWizardFormSubmit = (values: any, formType: WizardStepsFormTypes) => {
        setCurrentWizardStep(currentWizardStep + 1);
        setWizardState({ ...wizardState, [formType]: values });
    };

    const handleWizardFormFinish = (attributes: string[]): void => {

        const data: OIDCScopesListInterface = {
            claims: attributes,
            description: wizardState[ WizardStepsFormTypes.BASIC_DETAILS ]?.description
                ? wizardState[ WizardStepsFormTypes.BASIC_DETAILS ]?.description
                : "This is the description of the scope",
            displayName: wizardState[ WizardStepsFormTypes.BASIC_DETAILS ]?.displayName,
            name: wizardState[ WizardStepsFormTypes.BASIC_DETAILS ]?.scopeName
        };

        setIsClaimRequestLoading(true);

        createOIDCScope(data)
            .then(() => {
                closeWizard();
                dispatch(addAlert({
                    description: t("devPortal:components.oidcScopes.notifications.addOIDCScope" +
                        ".success.description"),
                    level: AlertLevels.SUCCESS,
                    message: t("devPortal:components.oidcScopes.notifications.addOIDCScope" +
                        ".success.message")
                }));
                onUpdate();
            })
            .catch((error) => {
                closeWizard();
                if (error.response && error.response.data && error.response.data.description) {
                    dispatch(addAlert({
                        description: error.response.data.description,
                        level: AlertLevels.ERROR,
                        message: t("devPortal:components.oidcScopes.notifications.addOIDCScope.error." +
                            "message")
                    }));

                    return;
                }

                dispatch(addAlert({
                    description: t("devPortal:components.oidcScopes.notifications.addOIDCScope" +
                        ".genericError.description"),
                    level: AlertLevels.ERROR,
                    message: t("devPortal:components.oidcScopes.notifications.addOIDCScope.genericError." +
                        "message")
                }));
            })
            .finally(() => {
                setIsClaimRequestLoading(false);
            });
    };

    const STEPS = [
        {
            content: (
                <AddOIDCScopeForm
                    initialValues={ wizardState && wizardState[ WizardStepsFormTypes.BASIC_DETAILS ] }
                    triggerSubmit={ submitGeneralDetails }
                    onSubmit={ (values) => handleWizardFormSubmit(values, WizardStepsFormTypes.BASIC_DETAILS) }
                    data-testid={ `${ testId }-form` }
                />
            ),
            icon: OIDCScopeWizardStepIcons.general,
            title: t("devPortal:components.oidcScopes.wizards.addScopeWizard.steps.basicDetails")
        },
        {
            content: (
                <OIDCScopeAttributesList
                    triggerSubmit={ finishSubmit }
                    onSubmit={ (values) => handleWizardFormFinish(values) }
                    selectedClaims={ selectedAttributes }
                    setSelectedClaims={ setFilterSelectedClaims }
                    setInitialSelectedClaims={ setSelectedAttributes }
                    availableClaims={ OIDCAttributes }
                    setAvailableClaims={ setOIDCAttributes }
                    data-testid={ `${ testId }-wizard` }
                />
            ),
            icon: OIDCScopeWizardStepIcons.claimConfig,
            title: t("devPortal:components.oidcScopes.wizards.addScopeWizard.steps.claims")
        }
    ];

    return (
        <Modal
            open={ true }
            className="wizard application-create-wizard"
            dimmer="blurring"
            size="small"
            onClose={ closeWizard }
            data-testid={ testId }
            closeOnDimmerClick
            closeOnEscape
        >
            <Modal.Header className="wizard-header">
                { t("devPortal:components.oidcScopes.wizards.addScopeWizard.title") }
                <Heading as="h6">
                    { t("devPortal:components.oidcScopes.wizards.addScopeWizard.subTitle") }
                </Heading>
            </Modal.Header>
            <Modal.Content className="steps-container">
                <Steps.Group
                    current={ currentWizardStep }
                    data-testid={ `${ testId }-steps` }
                >
                    { STEPS.map((step, index) => (
                        <Steps.Step
                            key={ index }
                            icon={ step.icon }
                            title={ step.title }
                            data-testid={ `${ testId }-step-${ index }` }
                        />
                    )) }
                </Steps.Group>
            </Modal.Content>
            <Modal.Content className="content-container" scrolling>
                { STEPS[ currentWizardStep ].content }
            </Modal.Content>
            <Modal.Actions>
                <Grid>
                    <Grid.Row column={ 1 }>
                        <Grid.Column mobile={ 8 } tablet={ 8 } computer={ 8 }>
                            <LinkButton
                                floated="left"
                                onClick={ () => closeWizard() }
                                data-testid={ `${ testId }-cancel-button` }
                            >
                                { t("common:cancel") }
                            </LinkButton>
                        </Grid.Column>
                        <Grid.Column mobile={ 8 } tablet={ 8 } computer={ 8 }>
                            { currentWizardStep < STEPS.length - 1 && (
                                <PrimaryButton
                                    floated="right"
                                    onClick={ navigateToNext }
                                    data-testid={ `${ testId }-next-button` }
                                >
                                    { t("common:next") }
                                    <Icon name="arrow right"/>
                                </PrimaryButton>
                            ) }
                            { currentWizardStep === STEPS.length - 1 && (
                                <PrimaryButton
                                    floated="right"
                                    onClick={ navigateToNext }
                                    data-testid={ `${ testId }-finish-button` }
                                >
                                    { t("common:finish") }
                                </PrimaryButton>
                            ) }
                            { currentWizardStep > 0 && (
                                <LinkButton
                                    floated="right"
                                    onClick={ navigateToPrevious }
                                    data-testid={ `${ testId }-previous-button` }
                                >
                                    <Icon name="arrow left"/>
                                    { t("common:previous") }
                                </LinkButton>
                            ) }
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </Modal.Actions>
        </Modal>
    );
};


/**
 * Default props for the add OIDC scope form component.
 */
OIDCScopeCreateWizard.defaultProps = {
    currentStep: 0,
    "data-testid": "add-oidc-scope-wizard"
};
