import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export function Loader() {
	return (
		<View style={styles.container}>
			<ActivityIndicator size="small" color="#0EA5E9" />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { paddingVertical: 12, alignItems: 'center' },
});


