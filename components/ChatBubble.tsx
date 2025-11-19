import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
	role: 'user' | 'assistant';
	text: string;
};

export function ChatBubble({ role, text }: Props) {
	const isUser = role === 'user';
	return (
		<View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
			<Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>{text}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	bubble: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, maxWidth: '80%', marginVertical: 6 },
	user: { alignSelf: 'flex-end', backgroundColor: '#0EA5E9' },
	assistant: { alignSelf: 'flex-start', backgroundColor: '#F3F4F6' },
	text: { fontSize: 15 },
	userText: { color: 'white' },
	assistantText: { color: '#111827' },
});


