import { ScAddr, ScTemplate, ScType } from 'ts-sc-client';
import { client } from '@api/sc/client';
import { ScConstruction, ScLinkContent, ScLinkContentType, ScEventParams, ScEventType } from 'ts-sc-client';
import { makeAgent } from '@api/sc/agents/makeAgent';
import { createLinkText } from './newMessageAgent';
import React from "react";

const nrelSystemIdentifier = 'nrel_system_identifier';
const question = 'question';
const actionCreateQuestionClassAndPhraseTemplate = 'action_create_question_class_and_phrase_template';
const rrel1 = 'rrel_1';
const rrel2 = 'rrel_2';
const conceptTextFile = 'concept_text_file';
const langRu = 'lang_ru';
const message = '_message';

const baseKeynodes = [
    { id: nrelSystemIdentifier, type: ScType.NodeConstNoRole},
    { id: question, type: ScType.NodeConstClass },
    { id: actionCreateQuestionClassAndPhraseTemplate, type: ScType.NodeConstClass },
    { id: rrel1, type: ScType.NodeConstRole },
    { id: rrel2, type: ScType.NodeConstRole },
    { id: conceptTextFile, type: ScType.NodeConstClass },
    { id: langRu, type: ScType.NodeConstClass },
    { id: message, type: ScType.NodeVar}
    
];

export const setSystemIdtf = async (addr: ScAddr, systemIdtf: string) => {
    const keynodes = await client.resolveKeynodes(baseKeynodes);

    const template = new ScTemplate();
    const linkAlias = "_link";

    const sysIdtfLinkConstruction = new ScConstruction();
    sysIdtfLinkConstruction.createLink(
        ScType.LinkConst,
        new ScLinkContent(systemIdtf, ScLinkContentType.String)
    );
    const [sysIdtfLinkNode] = await client.createElements(sysIdtfLinkConstruction);

    template.tripleWithRelation(
      addr,
      ScType.EdgeDCommonVar,
      sysIdtfLinkNode,
      ScType.EdgeAccessVarPosPerm,
      keynodes[nrelSystemIdentifier]
    );
    const result = await client.templateGenerate(template, {});
};

export const handleSave = async (
    phraseSystemIdentifierRef: React.RefObject<HTMLInputElement>,
    phraseRussianIdentifierRef: React.RefObject<HTMLInputElement>,
    form : string,
    chipsValues: string[]
) => {
        const inputValues = {
            phraseSystemIdentifier: phraseSystemIdentifierRef.current?.value || '',
            phraseRussianIdentifier: phraseRussianIdentifierRef.current?.value || '',
            };

        const phrases = chipsValues.join(', ');

        const result : string = form + '\n' + Object.values(inputValues).join('\n') + '\n' + phrases;

        const resultLinkAddr = await createLinkText(result);
        
        if (resultLinkAddr !== null) {
            await createQuestionClassAndPhraseTemplateAgent(resultLinkAddr);
        }
};

const describeAgent = async (
    keynodes: Record<string, ScAddr>,
    linkAddr: ScAddr,
) => {
    const actionNodeAlias = '_action_node';

    const template = new ScTemplate();

    template.triple(keynodes[question], ScType.EdgeAccessVarPosPerm, [ScType.NodeVar, actionNodeAlias]);
    template.triple(keynodes[actionCreateQuestionClassAndPhraseTemplate], ScType.EdgeAccessVarPosPerm, actionNodeAlias);

    template.tripleWithRelation(
        actionNodeAlias,
        ScType.EdgeAccessVarPosPerm,
        keynodes[message],
        ScType.EdgeAccessVarPosPerm,
        keynodes[rrel1],
    );
    template.tripleWithRelation(
        actionNodeAlias,
        ScType.EdgeAccessVarPosPerm,
        linkAddr,
        ScType.EdgeAccessVarPosPerm,
        keynodes[rrel2],
    );
    template.triple(keynodes[conceptTextFile], ScType.EdgeAccessVarPosPerm, linkAddr);
    template.triple(keynodes[langRu], ScType.EdgeAccessVarPosPerm, linkAddr);

    return [template, actionNodeAlias] as const;
};

const createQuestionClassAndPhraseTemplateAgent = async (linkAddr: ScAddr) => {
    const keynodes = await client.resolveKeynodes(baseKeynodes);

    const [template, userActionNodeAlias] = await describeAgent(keynodes, linkAddr);

    await makeAgent(template, userActionNodeAlias);
};

export const createPopupCheck = async (
    setCreatePopup
)  => {
    const concept_popup = 'concept_popup';

    const baseKeynodes = [
        { id: concept_popup, type: ScType.NodeConstClass},
    ];

    const keynodes = await client.resolveKeynodes(baseKeynodes);
    const eventParams = new ScEventParams(keynodes[concept_popup], ScEventType.AddOutgoingEdge, () => {setCreatePopup(true)});
    await client.eventsCreate([eventParams])
}