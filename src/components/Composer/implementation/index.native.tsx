import type {MarkdownStyle} from '@expensify/react-native-live-markdown';
import mimeDb from 'mime-db';
import type {ForwardedRef} from 'react';
import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import type {NativeSyntheticEvent, TextInput, TextInputChangeEventData, TextInputPasteEventData} from 'react-native';
import {StyleSheet} from 'react-native';
import type {FileObject} from '@components/AttachmentModal';
import type {ComposerProps} from '@components/Composer/types';
import type {AnimatedMarkdownTextInputRef} from '@components/RNMarkdownTextInput';
import RNMarkdownTextInput from '@components/RNMarkdownTextInput';
import useMarkdownStyle from '@hooks/useMarkdownStyle';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {containsOnlyEmojis} from '@libs/EmojiUtils';
import {splitExtensionFromFileName} from '@libs/fileDownload/FileUtils';
import CONST from '@src/CONST';

const excludeNoStyles: Array<keyof MarkdownStyle> = [];
const excludeReportMentionStyle: Array<keyof MarkdownStyle> = ['mentionReport'];

function Composer(
    {
        onClear: onClearProp = () => {},
        onPasteFile = () => {},
        isDisabled = false,
        maxLines,
        isComposerFullSize = false,
        style,
        selection,
        value,
        isGroupPolicyReport = false,
        ...props
    }: ComposerProps,
    ref: ForwardedRef<TextInput>,
) {
    const textInput = useRef<AnimatedMarkdownTextInputRef | null>(null);
    const textContainsOnlyEmojis = useMemo(() => containsOnlyEmojis(value ?? ''), [value]);
    const theme = useTheme();
    const markdownStyle = useMarkdownStyle(value, !isGroupPolicyReport ? excludeReportMentionStyle : excludeNoStyles);
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();

    useEffect(() => {
        if (!textInput.current || !textInput.current.setSelection || !selection || isComposerFullSize) {
            return;
        }

        // Preserve cursor position before setting selection
        const currentCursorPos = selection.start;

        // Use a small delay for proper cursor handling on iOS
        const timeoutID = setTimeout(() => {
            textInput.current?.setSelection(currentCursorPos, currentCursorPos);
        }, 0);

        return () => clearTimeout(timeoutID);

    }, [selection, isComposerFullSize]);

    /**
     * Set the TextInput Ref
     * @param {Element} el
     */
    const setTextInputRef = useCallback((el: AnimatedMarkdownTextInputRef) => {
        textInput.current = el;
        if (typeof ref !== 'function' || textInput.current === null) {
            return;
        }
        ref(textInput.current);
    }, []);

    const onClear = useCallback(
        ({nativeEvent}: NativeSyntheticEvent<TextInputChangeEventData>) => {
            onClearProp(nativeEvent.text);
        },
        [onClearProp],
    );

    const pasteFile = useCallback(
        (e: NativeSyntheticEvent<TextInputPasteEventData>) => {
            const clipboardContent = e.nativeEvent.items.at(0);
            if (clipboardContent?.type === 'text/plain') {
                return;
            }
            const mimeType = clipboardContent?.type ?? '';
            const fileURI = clipboardContent?.data;
            const baseFileName = fileURI?.split('/').pop() ?? 'file';
            const {fileName: stem, fileExtension: originalFileExtension} = splitExtensionFromFileName(baseFileName);
            const fileExtension = originalFileExtension || (mimeDb[mimeType].extensions?.[0] ?? 'bin');
            const fileName = `${stem}.${fileExtension}`;
            const file: FileObject = {uri: fileURI, name: fileName, type: mimeType};
            onPasteFile(file);
        },
        [onPasteFile],
    );

    const maxHeightStyle = useMemo(() => StyleUtils.getComposerMaxHeightStyle(maxLines, isComposerFullSize), [StyleUtils, isComposerFullSize, maxLines]);
    const composerStyle = useMemo(() => StyleSheet.flatten([style, textContainsOnlyEmojis ? styles.onlyEmojisTextLineHeight : {}]), [style, textContainsOnlyEmojis, styles]);

    return (
        <RNMarkdownTextInput
            id={CONST.COMPOSER.NATIVE_ID}
            multiline
            autoComplete="off"
            placeholderTextColor={theme.placeholderText}
            ref={setTextInputRef}
            value={value}
            rejectResponderTermination={false}
            smartInsertDelete={false}
            textAlignVertical="center"
            style={[composerStyle, maxHeightStyle]}
            markdownStyle={markdownStyle}
            {...props}
            readOnly={isDisabled}
            onPaste={pasteFile}
            onClear={onClear}
        />
    );
}

Composer.displayName = 'Composer';

export default React.forwardRef(Composer);
