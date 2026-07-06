import React, { useEffect, useState } from "react";
import { Image, Modal, Text, TouchableOpacity, View, ScrollView, RefreshControl, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, resolveUrl } from "../api/client";
import { styles as globalStyles } from "../styles/styles";
import { useAuth } from "../store/AuthProvider";
import SkeletonLoader from "../components/SkeletonLoader";
import ToolCard from "../components/ToolCard";
import { Ionicons } from "@expo/vector-icons";
import theme from "../styles/theme";

const { colors } = theme;

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [featuredTools, setFeaturedTools] = useState([]);
  const [communityDetail, setCommunityDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myListings, setMyListings] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  async function fetchData() {
    try {
      const [feedData, requestData, toolsData, listingsData, loansData] = await Promise.all([
        api("/communities/feed"),
        api("/borrow-requests"),
        api("/tools?status=available&sort=popular&limit=5"),
        api("/tools?owner=me&limit=3").catch(() => ({ tools: [] })),
        api("/borrow-requests?filter=lent").catch(() => ({ requests: [] }))
      ]);
      setPosts((feedData.posts || []).slice(0, 8));
      setRequests((requestData.requests || []).slice(0, 5));
      setFeaturedTools((toolsData.tools || []).slice(0, 5));
      setMyListings((listingsData.tools || []).slice(0, 3));
      setActiveLoans((loansData.requests || []).slice(0, 3));
    } catch (e) {
      console.warn("Failed to load home data", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData().catch(console.error);
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api(`/tools?search=${encodeURIComponent(searchQuery)}&limit=10`);
        setSearchResults(res.tools || []);
      } catch (e) {
        console.warn("Search failed", e);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const overdueCount = requests.filter((r) => r.status === "overdue").length;
  const pendingMaintenanceCount = requests.filter((r) => r.status === "pending_maintenance").length;
  const activeBorrowCount = requests.filter((r) => ["approved", "picked_up"].includes(r.status)).length;
  const activeLoanCount = activeLoans.length;

  return (
    <SafeAreaView style={globalStyles.screen}>
      <ScrollView
        contentContainerStyle={localStyles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { await fetchData(); } finally { setRefreshing(false); } }} />
        }
      >
        {/* Header - Community Style */}
        <View style={localStyles.headerContainer}>
          <View style={localStyles.headerTopRow}>
            <View>
              <Text style={localStyles.headerTitle}>NeighborhoodShare</Text>
              <Text style={localStyles.headerSubtitle}>Welcome back, {user.fullName?.split(" ")[0] || "neighbor"}!</Text>
            </View>
            <View style={localStyles.headerActions}>
              {/* Trust Points Badge */}
              <View style={localStyles.trustBadge}>
                <Ionicons name="shield-checkmark" size={16} color={colors.green} />
                <Text style={localStyles.trustBadgeText}>{user.trustPoints}</Text>
              </View>

              {/* Notifications */}
              <TouchableOpacity style={localStyles.iconButton} onPress={() => navigation.navigate("Notifications")}>
                <Ionicons name="notifications-outline" size={20} color={colors.navy} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={localStyles.searchContainer}>
            <Ionicons name="search-outline" size={18} color={colors.muted} />
            <TextInput
              style={localStyles.searchInput}
              placeholder="Search tools & neighbors"
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {searchQuery.length > 0 ? (
          <View style={localStyles.sectionContainer}>
            <Text style={localStyles.sectionTitle}>Search Results</Text>
            {isSearching ? (
              <ActivityIndicator size="large" color={colors.green} style={localStyles.searchLoader} />
            ) : searchResults.length === 0 ? (
              <View style={localStyles.emptyStateContainer}>
                <Text style={localStyles.emptyStateText}>No tools found for "{searchQuery}"</Text>
              </View>
            ) : (
              searchResults.map(tool => (
                <View key={tool._id} style={localStyles.searchResultItem}>
                  <ToolCard tool={tool} onPress={() => navigation.navigate("ToolDetail", { tool })} />
                </View>
              ))
            )}
          </View>
        ) : (
          <>
            {/* Quick Nav Pills */}
            <View style={localStyles.navPillsContainer}>
              <View style={localStyles.navPillsRow}>
                {[
                  { key: "browse", icon: "search-outline", label: "Browse", screen: "Browse" },
                  { key: "add", icon: "add-circle-outline", label: "Add Tool", screen: "AddTool" },
                  { key: "community", icon: "people-outline", label: "Community", screen: "Community" },
                  { key: "messages", icon: "chatbubbles-outline", label: "Messages", screen: "ChatThreads" }
                ].map((a) => (
                  <TouchableOpacity
                    key={a.key}
                    style={localStyles.navPill}
                    onPress={() => navigation.navigate(a.screen)}
                  >
                    <Ionicons name={a.icon} size={18} color={colors.muted} />
                    <Text style={localStyles.navPillText} numberOfLines={1}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Alerts */}
            {user.trustPoints <= 50 && (
              <View style={[localStyles.alertBox, localStyles.alertBoxDanger]}>
                <View style={localStyles.alertContentRow}>
                  <Ionicons name="warning" size={22} color={colors.error} />
                  <View style={localStyles.alertTextContent}>
                    <Text style={localStyles.alertTitleDanger}>Low Trust Score</Text>
                    <Text style={localStyles.alertSubtitle}>Borrowing is paused below 51 pts. Return items to rebuild.</Text>
                  </View>
                </View>
              </View>
            )}

            {overdueCount > 0 && (
              <View style={[localStyles.alertBox, localStyles.alertBoxDanger]}>
                <View style={localStyles.alertContentRow}>
                  <Ionicons name="alert-circle" size={22} color={colors.error} />
                  <View style={localStyles.alertTextContent}>
                    <Text style={localStyles.alertTitleDanger}>{overdueCount} Overdue</Text>
                    <Text style={localStyles.alertSubtitle}>Return immediately to avoid trust penalties.</Text>
                  </View>
                  <TouchableOpacity style={localStyles.alertButtonDanger} onPress={() => navigation.navigate("Borrowings")}>
                    <Text style={localStyles.alertButtonText}>Return</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {pendingMaintenanceCount > 0 && (
              <View style={[localStyles.alertBox, localStyles.alertBoxWarning]}>
                <View style={localStyles.alertContentRow}>
                  <Ionicons name="construct" size={22} color={colors.warning} />
                  <View style={localStyles.alertTextContent}>
                    <Text style={localStyles.alertTitleWarning}>Maintenance</Text>
                    <Text style={localStyles.alertSubtitle}>Charges need your review.</Text>
                  </View>
                  <TouchableOpacity style={localStyles.alertButtonWarning} onPress={() => navigation.navigate("MaintenanceCost")}>
                    <Text style={localStyles.alertButtonText}>Review</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Stats Row */}
            <View style={localStyles.statsRow}>
              <View style={localStyles.statBox}>
                <Text style={localStyles.statValue}>{activeBorrowCount}</Text>
                <Text style={localStyles.statLabel}>Borrowed</Text>
              </View>
              <View style={localStyles.statBox}>
                <Text style={localStyles.statValue}>{myListings.length}</Text>
                <Text style={localStyles.statLabel}>Listings</Text>
              </View>
              <View style={localStyles.statBox}>
                <Text style={localStyles.statValue}>{activeLoanCount}</Text>
                <Text style={localStyles.statLabel}>Lent Out</Text>
              </View>
            </View>

            {/* My Listings */}
            {myListings.length > 0 && (
              <View style={localStyles.sectionContainer}>
                <View style={localStyles.sectionHeaderRow}>
                  <Text style={localStyles.sectionTitle}>My Listings</Text>
                  <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
                    <Text style={localStyles.seeAllText}>View all</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {myListings.map((tool) => (
                    <TouchableOpacity
                      key={tool._id}
                      style={localStyles.listingCard}
                      onPress={() => navigation.navigate("ToolDetail", { tool })}
                    >
                      {tool.images && tool.images[0] ? (
                        <Image source={{ uri: resolveUrl(tool.images[0].url) }} style={localStyles.listingImage} />
                      ) : (
                        <View style={localStyles.listingFallback}>
                          <Ionicons name="construct" size={32} color="#cbd5e1" />
                        </View>
                      )}
                      <View style={localStyles.listingBody}>
                        <Text style={localStyles.listingTitle} numberOfLines={1}>{tool.name}</Text>
                        <View style={localStyles.listingStatusRow}>
                          <View style={[localStyles.statusIndicator, { backgroundColor: tool.status === "available" ? colors.green : colors.error }]} />
                          <Text style={localStyles.listingStatusText}>{tool.status}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Active Loans */}
            {activeLoans.length > 0 && (
              <View style={localStyles.sectionContainer}>
                <View style={localStyles.sectionHeaderRow}>
                  <Text style={localStyles.sectionTitle}>Active Loans</Text>
                  <TouchableOpacity onPress={() => navigation.navigate("Borrowings")}>
                    <Text style={localStyles.seeAllText}>View all</Text>
                  </TouchableOpacity>
                </View>
                {activeLoans.map((loan) => (
                  <TouchableOpacity
                    key={loan._id}
                    style={localStyles.loanCard}
                    onPress={() => navigation.navigate("Borrowings")}
                  >
                    <View style={localStyles.loanIconWrap}>
                      <Ionicons name="construct" size={22} color={colors.muted} />
                    </View>
                    <View style={localStyles.loanTextWrap}>
                      <Text style={localStyles.loanTitle}>{loan.tool?.name}</Text>
                      <Text style={localStyles.loanSubtitle}>{loan.borrower?.fullName || "Unknown"}</Text>
                    </View>
                    <View style={[localStyles.loanStatusBadge, loan.status === "overdue" && localStyles.loanStatusBadgeOverdue]}>
                      <Text style={[localStyles.loanStatusText, loan.status === "overdue" && localStyles.loanStatusTextOverdue]}>{loan.status}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Trending Tools */}
            {featuredTools.length > 0 && (
              <View style={localStyles.sectionContainer}>
                <View style={localStyles.sectionHeaderRow}>
                  <Text style={localStyles.sectionTitle}>Trending Tools</Text>
                  <TouchableOpacity onPress={() => navigation.navigate("Browse")}>
                    <Text style={localStyles.seeAllText}>See all</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {featuredTools.map((tool) => (
                    <View key={tool._id} style={localStyles.trendingToolWrap}>
                      <ToolCard tool={tool} onPress={() => navigation.navigate("ToolDetail", { tool })} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Community Posts - Reddit Style */}
            <View style={localStyles.sectionContainer}>
              <View style={localStyles.sectionHeaderRow}>
                <Text style={localStyles.sectionTitle}>Community Posts</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Community")}>
                  <Text style={localStyles.seeAllText}>Discover</Text>
                </TouchableOpacity>
              </View>
              {loading ? (
                <SkeletonLoader variant="listItem" count={3} containerStyle={localStyles.skeletonMargin} />
              ) : posts.length === 0 ? (
                <View style={localStyles.emptyPostsContainer}>
                  <Ionicons name="newspaper-outline" size={40} color="#cbd5e1" />
                  <Text style={localStyles.emptyPostsText}>No posts yet</Text>
                </View>
              ) : (
                posts.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    style={globalStyles.redditPostCard}
                    onPress={() => navigation.navigate("Community")}
                  >
                    {/* Vote Rail */}
                    <View style={globalStyles.voteRail}>
                      <Ionicons name="arrow-up-outline" size={20} color={colors.muted} />
                      <Text style={globalStyles.voteText}>{(item.upvotes?.length || 0) - (item.downvotes?.length || 0)}</Text>
                      <Ionicons name="arrow-down-outline" size={20} color={colors.muted} />
                    </View>
                    {/* Post Content */}
                    <View style={globalStyles.postContent}>
                      <View style={globalStyles.postMetaRow}>
                        <TouchableOpacity onPress={() => setCommunityDetail(item.community)} style={localStyles.communityChip}>
                          <Text style={localStyles.communityChipText}>r/{item.community?.name || "community"}</Text>
                        </TouchableOpacity>
                        <Text style={localStyles.metaDot}>•</Text>
                        <Text style={localStyles.metaAuthor}>u/{item.author?.fullName?.split(" ")[0] || "neighbor"}</Text>
                      </View>
                      <Text style={localStyles.postTitle}>{item.title}</Text>
                      {item.body ? <Text style={localStyles.postBody} numberOfLines={3}>{item.body}</Text> : null}
                      {(item.media?.[0]?.resourceType === "image" || item.imageUrl) ? (
                        <Image source={{ uri: resolveUrl(item.media?.[0]?.url || item.imageUrl) }} style={localStyles.postImage} />
                      ) : null}
                      <View style={globalStyles.postActions}>
                        <View style={globalStyles.postAction}>
                          <Ionicons name="chatbubble-outline" size={16} color={colors.muted} />
                          <Text style={localStyles.postActionText}>{item.comments?.length || 0}</Text>
                        </View>
                        <View style={globalStyles.postAction}>
                          <Ionicons name="share-outline" size={16} color={colors.muted} />
                          <Text style={localStyles.postActionText}>Share</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Recent Activity */}
            <View style={localStyles.sectionContainer}>
              <View style={localStyles.sectionHeaderRow}>
                <Text style={localStyles.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Borrowings")}>
                  <Text style={localStyles.seeAllText}>View all</Text>
                </TouchableOpacity>
              </View>
              {loading ? (
                <SkeletonLoader variant="listItem" count={2} containerStyle={localStyles.skeletonMargin} />
              ) : requests.length === 0 ? (
                <View style={localStyles.emptyPostsContainer}>
                  <Ionicons name="swap-horizontal" size={32} color="#cbd5e1" />
                  <Text style={localStyles.emptyPostsText}>No recent activity</Text>
                </View>
              ) : (
                requests.map((request) => (
                  <TouchableOpacity
                    key={request._id}
                    style={localStyles.loanCard}
                    onPress={() => navigation.navigate("Borrowings")}
                  >
                    <View style={localStyles.loanIconWrap}>
                      <Ionicons name="swap-horizontal" size={22} color={colors.muted} />
                    </View>
                    <View style={localStyles.loanTextWrap}>
                      <Text style={localStyles.loanTitle}>{request.tool?.name}</Text>
                      <Text style={localStyles.loanSubtitle}>{request.status} • {request.escrowPoints} pts</Text>
                    </View>
                    <View style={localStyles.loanStatusBadge}>
                      <Text style={localStyles.loanStatusText}>{request.status}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Community Detail Modal */}
      <Modal visible={!!communityDetail} transparent animationType="slide" onRequestClose={() => setCommunityDetail(null)}>
        <View style={globalStyles.modalShade}>
          <View style={globalStyles.modalPanel}>
            <View style={localStyles.modalHeader}>
              <View style={localStyles.modalIconWrap}>
                <Ionicons name="people" size={28} color="#ffffff" />
              </View>
              <Text style={localStyles.modalTitle}>{communityDetail?.name}</Text>
            </View>
            <Text style={localStyles.modalDescription}>
              {communityDetail?.description || "Community activity from verified residents."}
            </Text>
            {communityDetail?.location && (
              <View style={localStyles.modalLocationRow}>
                <Ionicons name="location" size={16} color={colors.muted} />
                <Text style={localStyles.modalLocationText}>{communityDetail.location}</Text>
              </View>
            )}
            <TouchableOpacity style={[globalStyles.primaryButton, localStyles.modalPrimaryBtn]} onPress={() => { setCommunityDetail(null); navigation.navigate("Community"); }}>
              <Text style={globalStyles.primaryButtonText}>Open Community</Text>
            </TouchableOpacity>
            <TouchableOpacity style={globalStyles.ghostButton} onPress={() => setCommunityDetail(null)}>
              <Text style={localStyles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 40,
  },
  headerContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.navy,
    lineHeight: 26,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  trustBadgeText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.navy,
  },
  iconButton: {
    backgroundColor: "#f1f5f9",
    padding: 10,
    borderRadius: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f7f4ed",
    borderRadius: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.navy,
    fontSize: 14,
    fontWeight: "600",
    height: "100%",
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
  },
  seeAllText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "700",
  },
  searchLoader: {
    marginTop: 20,
  },
  emptyStateContainer: {
    alignItems: "center",
    padding: 32,
  },
  emptyStateText: {
    color: colors.muted,
  },
  searchResultItem: {
    marginBottom: 12,
  },
  navPillsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 16,
  },
  navPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  navPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  navPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.muted,
  },
  alertBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  alertBoxDanger: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  alertBoxWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
  },
  alertContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  alertTextContent: {
    flex: 1,
  },
  alertTitleDanger: {
    fontWeight: "800",
    color: colors.error,
    fontSize: 14,
  },
  alertTitleWarning: {
    fontWeight: "800",
    color: "#92400e",
    fontSize: 14,
  },
  alertSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  alertButtonDanger: {
    backgroundColor: colors.error,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  alertButtonWarning: {
    backgroundColor: colors.warning,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  alertButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  statsRow: {
    marginHorizontal: 16,
    marginBottom: 20,
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.ink,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    fontWeight: "700",
  },
  listingCard: {
    width: 160,
    marginRight: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  listingImage: {
    width: "100%",
    height: 100,
    backgroundColor: "#f1f5f9",
  },
  listingFallback: {
    width: "100%",
    height: 100,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  listingBody: {
    padding: 12,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 6,
  },
  listingStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listingStatusText: {
    fontSize: 11,
    color: colors.muted,
    textTransform: "capitalize",
    fontWeight: "700",
  },
  loanCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  loanIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.chip,
    alignItems: "center",
    justifyContent: "center",
  },
  loanTextWrap: {
    flex: 1,
  },
  loanTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
  },
  loanSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    fontWeight: "600",
  },
  loanStatusBadge: {
    backgroundColor: colors.chip,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  loanStatusBadgeOverdue: {
    backgroundColor: "#fef2f2",
  },
  loanStatusText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
  },
  loanStatusTextOverdue: {
    color: colors.error,
  },
  trendingToolWrap: {
    width: 220,
    marginRight: 12,
  },
  skeletonMargin: {
    marginBottom: 10,
  },
  emptyPostsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyPostsText: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 12,
    fontWeight: "600",
  },
  communityChip: {
    backgroundColor: colors.chip,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  communityChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.muted,
  },
  metaDot: {
    fontSize: 11,
    color: colors.muted,
  },
  metaAuthor: {
    fontSize: 11,
    color: colors.muted,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
    lineHeight: 20,
  },
  postBody: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginTop: 4,
  },
  postImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: "#f1f5f9",
  },
  postActionText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "700",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.ink,
  },
  modalDescription: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 20,
  },
  modalLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  modalLocationText: {
    fontSize: 13,
    color: colors.muted,
  },
  modalPrimaryBtn: {
    backgroundColor: colors.navy,
    marginBottom: 10,
  },
  modalCloseText: {
    color: colors.muted,
    fontWeight: "800",
    textAlign: "center",
  },
});