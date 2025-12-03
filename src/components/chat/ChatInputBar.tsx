import React, { forwardRef } from 'react';
import { View, TextInput, TouchableOpacity, Image, Text, StyleSheet } from 'react-native';
import { PaperClipIcon, XCircleIcon } from 'react-native-heroicons/outline';

interface ChatInputBarProps {
  inputText: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onImagePick: () => void;
  selectedImageUri: string | null;
  onClearImage: () => void;
  isLoading: boolean;
  keyboardHeight: number;
  insetsBottom: number;
}

export const ChatInputBar = forwardRef<TextInput, ChatInputBarProps>(
  (
    {
      inputText,
      onChangeText,
      onSend,
      onImagePick,
      selectedImageUri,
      onClearImage,
      isLoading,
      keyboardHeight,
      insetsBottom,
    },
    ref
  ) => {
  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: keyboardHeight > 0 ? 8 : insetsBottom + 8,
        },
      ]}
    >
      {/* 画像プレビュー */}
      {selectedImageUri && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.clearImageButton} onPress={onClearImage}>
            <XCircleIcon size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* 入力バー */}
      <View style={styles.inputRow}>
        {/* 画像添付ボタン */}
        <TouchableOpacity
          onPress={onImagePick}
          disabled={isLoading}
          style={styles.attachButton}
        >
          <PaperClipIcon size={24} color={isLoading ? '#ccc' : '#007AFF'} />
        </TouchableOpacity>

        {/* テキスト入力 */}
        <TextInput
          ref={ref}
          value={inputText}
          onChangeText={onChangeText}
          placeholder="質問してみましょう"
          multiline
          style={styles.textInput}
        />

        {/* 送信ボタン */}
        <TouchableOpacity
          onPress={onSend}
          disabled={(inputText.trim() === '' && !selectedImageUri) || isLoading}
          style={[
            styles.sendButton,
            {
              backgroundColor:
                inputText.trim() !== '' || selectedImageUri ? '#007AFF' : '#E5E5EA',
            },
          ]}
        >
          <Text
            style={[
              styles.sendButtonText,
              {
                color: inputText.trim() !== '' || selectedImageUri ? '#fff' : '#999',
              },
            ]}
          >
            ↑
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  imagePreviewContainer: {
    marginBottom: 8,
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  clearImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachButton: {
    padding: 8,
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
});
