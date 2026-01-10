/**
 * Reviews List Component
 * Horizontal scrollable reviews with star ratings and user photos
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const REVIEW_CARD_WIDTH = SCREEN_WIDTH * 0.85;

type Review = {
	id: string;
	userName: string;
	userAvatar?: string;
	rating: number;
	comment: string;
	date: string;
	photos?: string[];
};

type ReviewsListProps = {
	reviews: Review[];
	averageRating?: number;
	totalReviews?: number;
};

function ReviewCard({ review, index }: { review: Review; index: number }) {
	return (
		<Animated.View
			entering={FadeInRight.duration(400).delay(index * 100)}
			style={[styles.reviewCard, { width: REVIEW_CARD_WIDTH }]}
		>
			{/* User Info */}
			<View style={styles.reviewHeader}>
				<View style={styles.userInfo}>
					{review.userAvatar ? (
						<Image
							source={{ uri: review.userAvatar }}
							style={styles.avatar}
							resizeMode="cover"
						/>
					) : (
						<View style={styles.avatarPlaceholder}>
							<IconSymbol name="person.fill" size={20} color={GIFTYY_THEME.colors.gray400} />
						</View>
					)}
					<View style={styles.userDetails}>
						<Text style={styles.userName}>{review.userName}</Text>
						<Text style={styles.reviewDate}>{review.date}</Text>
					</View>
				</View>
				<View style={styles.starsContainer}>
					{[1, 2, 3, 4, 5].map((star) => (
						<IconSymbol
							key={star}
							name={star <= review.rating ? 'star.fill' : 'star'}
							size={14}
							color="#fbbf24"
						/>
					))}
				</View>
			</View>

			{/* Review Comment */}
			<Text style={styles.reviewComment} numberOfLines={4}>
				{review.comment}
			</Text>

			{/* Review Photos */}
			{review.photos && review.photos.length > 0 && (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.photosContainer}
					contentContainerStyle={styles.photosContent}
				>
					{review.photos.map((photo, idx) => (
						<Image
							key={idx}
							source={{ uri: photo }}
							style={styles.reviewPhoto}
							resizeMode="cover"
						/>
					))}
				</ScrollView>
			)}
		</Animated.View>
	);
}

export function ReviewsList({
	reviews,
	averageRating = 4.5,
	totalReviews = 0,
}: ReviewsListProps) {
	if (!reviews || reviews.length === 0) {
		return (
			<View style={styles.emptyContainer}>
				<IconSymbol name="star" size={48} color={GIFTYY_THEME.colors.gray300} />
				<Text style={styles.emptyText}>No reviews yet</Text>
				<Text style={styles.emptySubtext}>Be the first to review this product!</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Rating Summary */}
			<View style={styles.summaryContainer}>
				<View style={styles.ratingDisplay}>
					<Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
					<View style={styles.starsContainer}>
						{[1, 2, 3, 4, 5].map((star) => (
							<IconSymbol
								key={star}
								name={star <= Math.round(averageRating) ? 'star.fill' : 'star'}
								size={20}
								color="#fbbf24"
							/>
						))}
					</View>
					<Text style={styles.totalReviews}>{totalReviews} reviews</Text>
				</View>
			</View>

			{/* Reviews Carousel */}
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.reviewsContainer}
				decelerationRate="fast"
				snapToInterval={REVIEW_CARD_WIDTH + 16}
				snapToAlignment="start"
			>
				{reviews.map((review, index) => (
					<ReviewCard key={review.id} review={review} index={index} />
				))}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingVertical: GIFTYY_THEME.spacing.lg,
	},
	summaryContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		marginBottom: GIFTYY_THEME.spacing.lg,
	},
	ratingDisplay: {
		alignItems: 'center',
		paddingVertical: GIFTYY_THEME.spacing.xl,
		backgroundColor: GIFTYY_THEME.colors.cream,
		borderRadius: GIFTYY_THEME.radius.xl,
	},
	averageRating: {
		fontSize: GIFTYY_THEME.typography.sizes['4xl'],
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	starsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	totalReviews: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray600,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
	},
	reviewsContainer: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		gap: GIFTYY_THEME.spacing.md,
	},
	reviewCard: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderRadius: GIFTYY_THEME.radius.xl,
		padding: GIFTYY_THEME.spacing.lg,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		...GIFTYY_THEME.shadows.sm,
		marginRight: GIFTYY_THEME.spacing.md,
	},
	reviewHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	userInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginRight: GIFTYY_THEME.spacing.md,
	},
	avatarPlaceholder: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: GIFTYY_THEME.colors.gray200,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: GIFTYY_THEME.spacing.md,
	},
	userDetails: {
		flex: 1,
	},
	userName: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		marginBottom: 2,
	},
	reviewDate: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray500,
	},
	reviewComment: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		lineHeight: 20,
		color: GIFTYY_THEME.colors.gray700,
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	photosContainer: {
		marginTop: GIFTYY_THEME.spacing.sm,
	},
	photosContent: {
		gap: GIFTYY_THEME.spacing.sm,
	},
	reviewPhoto: {
		width: 80,
		height: 80,
		borderRadius: GIFTYY_THEME.radius.md,
		marginRight: GIFTYY_THEME.spacing.sm,
	},
	emptyContainer: {
		padding: GIFTYY_THEME.spacing['2xl'],
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyText: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray700,
		marginTop: GIFTYY_THEME.spacing.md,
		marginBottom: GIFTYY_THEME.spacing.sm,
	},
	emptySubtext: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		color: GIFTYY_THEME.colors.gray500,
		textAlign: 'center',
	},
});

