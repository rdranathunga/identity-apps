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
import { AlertLevels, ExternalClaim, SBACInterface, TestableComponentInterface } from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import { EmptyPlaceholder, PrimaryButton } from "@wso2is/react-components";
import React, { FunctionComponent, ReactElement, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Divider, Grid, Icon, Input, Popup, Segment, Table } from "semantic-ui-react";
import { OIDCScopeAttributes } from "./oidc-scope-attributes";
import { EmptyPlaceholderIllustrations, FeatureConfigInterface } from "../../core";
import { updateOIDCScopeDetails } from "../api";
import { OIDCScopesManagementConstants } from "../constants";
import { OIDCScopesListInterface } from "../models";

/**
 * Proptypes for the OIDC scope edit component.
 */
interface EditScopePropsInterface extends SBACInterface<FeatureConfigInterface>, TestableComponentInterface {
    /**
     * Editing scope.
     */
    scope: OIDCScopesListInterface;
    /**
     * Is the data still loading.
     */
    isLoading?: boolean;
    /**
     * Callback to update the scope details.
     */
    onUpdate: (name: string) => void;
}

/**
 * OIDC scope edit component.
 *
 * @param {EditScopePropsInterface} props - Props injected to the component.
 *
 * @return {ReactElement}
 */
export const EditOIDCScope: FunctionComponent<EditScopePropsInterface> = (
    props: EditScopePropsInterface
): ReactElement => {

    const {
        scope,
        isLoading,
        onUpdate,
        ["data-testid"]: testId
    } = props;

    const { t } = useTranslation();

    const dispatch = useDispatch();

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
    }, []);

    useEffect(() => {
        if (OIDCAttributes == undefined) {
            return;
        }

        mapSelectedAttributes();
    }, [ OIDCAttributes, scope.claims ]);

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
                    message: t("devPortal:components.oidcScopes.notifications.fetchOIDClaims" +
                        ".genericError.message")
                }));
            })
            .finally(() => {
                setIsClaimRequestLoading(false);
            });
    };

    const mapSelectedAttributes = () => {
        if (!scope.claims) {
            return;
        }

        const selected = [];
        const unselected = [];
        scope?.claims?.map((claim) => {
            selected.push(OIDCAttributes.find((item) => item.claimURI == claim));
            // unselected.push(OIDCAttributes.filter((item) => item.claimURI !== claim));
        });
        setSelectedAttributes(selected);
        // setOIDCAttributes(unselected);
    };

    const updateOIDCScope = (attributes: string[]): void => {
        const data: OIDCScopesListInterface = {
            displayName: scope.displayName,
            claims: attributes,
            description: ""
        };

        updateOIDCScopeDetails(scope.name, data)
            .then(() => {
                dispatch(addAlert({
                    description: t("devPortal:components.oidcScopes.notifications.updateOIDCScope.success" +
                        ".description"),
                    level: AlertLevels.SUCCESS,
                    message: t("devPortal:components.oidcScopes.notifications.updateOIDCScope.success" +
                        ".message")
                }));
                onUpdate(scope.name);
            })
            .catch((error) => {
                if (error.response && error.response.data && error.response.data.description) {
                    dispatch(addAlert({
                        description: error.response.data.description,
                        level: AlertLevels.ERROR,
                        message: t("devPortal:components.oidcScopes.notifications.updateOIDCScope.error" +
                            ".message")
                    }));

                    return;
                }

                dispatch(addAlert({
                    description: t("devPortal:components.oidcScopes.notifications.updateOIDCScope" +
                        ".genericError.description"),
                    level: AlertLevels.ERROR,
                    message: t("devPortal:components.oidcScopes.notifications.updateOIDCScope" +
                        ".genericError.message")
                }));
            });
    };

    const showAttributeSelectionModal = (() => {
        return (
            <OIDCScopeAttributes
                onUpdateAttributes={ updateOIDCScope }
                selectedClaims={ selectedAttributes }
                setSelectedClaims={ setFilterSelectedClaims }
                setInitialSelectedClaims={ setSelectedAttributes }
                showAddModal={ showSelectionModal }
                setShowAddModal={ setShowSelectionModal }
                availableClaims={ OIDCAttributes }
                setAvailableClaims={ setOIDCAttributes }
                data-testid={ `${ testId }-wizard` }
            />
        )}
    );

    const handleOpenSelectionModal = () => {
        setShowSelectionModal(true);
    };

    const handleRemoveAttribute = (claim: string): void => {
        const assignedClaims = scope?.claims;
        const newClaimList = assignedClaims.filter((claimName) => claimName !== claim);

        updateOIDCScope(newClaimList);
    };

    return (
        <>
            <Grid>
                <Grid.Row>
                    <Grid.Column computer={ 8 }>
                        {
                            scope?.claims?.length > 0 ? (
                                <Segment.Group fluid>
                                    <Segment
                                        data-testid="user-mgt-roles-list"
                                        className="user-role-edit-header-segment"
                                    >
                                        <Grid.Row>
                                            <Grid.Column>
                                                <Input
                                                    data-testid="scope-mgt-claim-list-search-input"
                                                    icon={ <Icon name="search"/> }
                                                    onChange={ null }
                                                    placeholder={ t("devPortal:components.oidcScopes.editScope." +
                                                        "claimList.searchClaims") }
                                                    floated="right"
                                                    size="small"
                                                />
                                                <PrimaryButton
                                                    data-testid="user-mgt-roles-list-update-button"
                                                    size="medium"
                                                    icon={ <Icon name="add"/> }
                                                    floated="right"
                                                    onClick={ handleOpenSelectionModal }
                                                >
                                                    <Icon name="add"/>
                                                    { t("devPortal:components.oidcScopes.editScope." +
                                                        "claimList.addClaim") }
                                                </PrimaryButton>
                                            </Grid.Column>
                                        </Grid.Row>
                                        <Divider hidden/>
                                        <Grid.Row>
                                            <Table singleLine basic>
                                                <Table.Body>
                                                    {
                                                        scope?.claims?.map((claim, index) => {
                                                            return (
                                                                <Table.Row key={ index }>
                                                                    <Table.Cell width={ 15 }>
                                                                        { claim }
                                                                    </Table.Cell>
                                                                    <Table.Cell textAlign="center">
                                                                        <Popup
                                                                            content="Remove attribute"
                                                                            trigger={
                                                                                <Icon
                                                                                    color="grey"
                                                                                    name="trash alternate"
                                                                                    onClick={ () =>
                                                                                        handleRemoveAttribute(claim)
                                                                                    }
                                                                                />
                                                                            }
                                                                        />
                                                                    </Table.Cell>
                                                                </Table.Row>
                                                            )
                                                        })
                                                    }
                                                </Table.Body>
                                            </Table>
                                        </Grid.Row>
                                    </Segment>
                                </Segment.Group>
                            ) : (
                                <Segment>
                                    <EmptyPlaceholder
                                        data-testid="scope-mgt-empty-claims-list"
                                        title={ t("devPortal:components.oidcScopes.editScope.claimList." +
                                            "emptyPlaceholder.title") }
                                        subtitle={ [
                                            t("devPortal:components.oidcScopes.editScope.claimList." +
                                                "emptyPlaceholder.subtitles.0"),
                                            t("devPortal:components.oidcScopes.editScope.claimList." +
                                                "emptyPlaceholder.subtitles.1")
                                        ] }
                                        action={
                                            <PrimaryButton
                                                data-testid="scope-mgt-empty-claims-list-add-claim-button"
                                                onClick={ handleOpenSelectionModal }
                                                icon="plus"
                                            >
                                                <Icon name="add"/>
                                                { t("devPortal:components.oidcScopes.editScope.claimList." +
                                                    "emptyPlaceholder.action") }
                                            </PrimaryButton>
                                        }
                                        image={ EmptyPlaceholderIllustrations.emptyList }
                                        imageSize="tiny"
                                    />
                                </Segment>
                            )
                        }
                    </Grid.Column>
                </Grid.Row>
            </Grid>
            { showAttributeSelectionModal() }
        </>
    );
};
