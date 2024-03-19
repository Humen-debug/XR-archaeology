import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View, FlatList, Platform } from "react-native";
import MapView, { LatLng, MapMarker, Marker, Polyline } from "react-native-maps";
import { Dimensions } from "react-native";
import { MainBody, IconBtn, MarkerCallout, ArrowLine } from "@components";
import React, { createRef, useEffect, useMemo, useRef, useState } from "react";
import ExploreListModal from "@components/map/explore_list_modal";
import ExploreItem from "@components/map/explore_item";
import ExploreModal from "@components/map/explore_modal";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useAppTheme } from "@providers/style_provider";
import { getBoundaries } from "@/plugins/geolocation";
import { useFeathers } from "@/providers/feathers_provider";
import { Location, Route } from "@/models";
import { ActivityIndicator } from "react-native-paper";
import { getCurrentPositionAsync } from "expo-location";

const ITEM_WIDTH = 300;
const ITEM_SPACING = 10;

export default function Explore() {
  const { theme } = useAppTheme();
  const feathers = useFeathers();
  const router = useRouter();
  const { id, latitude, longitude } = useLocalSearchParams<{ id?: string; latitude?: string; longitude?: string }>();
  const [points, setPoints] = useState<Location[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const initPoint = {
    latitude: !!latitude ? Number(latitude) : 39.92634215565024,
    longitude: !!longitude ? Number(longitude) : 44.74058628178656,
  };
  const [loaded, setLoaded] = useState(false);

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const style = useStyle({
    spacing: theme.spacing,
    screenWidth,
  });

  const [listOpen, setListOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [focusPoint, setFocusPoint] = useState<string | undefined>(id);
  const focusIndex = useMemo(() => points.findIndex((point) => point._id === focusPoint), [focusPoint]);
  const mapRef = createRef<MapView>();
  const [heading, setHeading] = useState(0);
  const routeListRef = createRef<FlatList>();
  const cardListStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      bottom: withTiming(detailOpen || listOpen ? -screenHeight : 86 + theme.spacing.md),
    };
  });

  const isAnimate = useRef(false);
  const isIOS = Platform.OS === "ios";

  const bound = useMemo(() => getBoundaries(points), [points]);

  useEffect(() => {
    async function init() {
      try {
        let res = await feathers.service("locations").find({
          paginate: false,
          query: { $sort: { route: 1, order: 1 } },
        });
        let points: Location[] = [];
        if (Array.isArray(res)) {
          points = res;
        } else if (res.data) {
          var total = res.total;
          while (total > points.length) {
            res = await feathers.service("locations").find({
              query: {
                $sort: { route: 1, order: 1 },
                $skip: points.length,
              },
            });
            if (res.data.length === 0) break;
            points = [...points, ...res.data];
          }
        }
        setPoints(points);
        const routeIds = Array.from(new Set(points.map((point) => point.route)));

        let routes: Route[] = [];
        res = await feathers.service("routes").find({ query: { _id: { $in: routeIds } }, paginate: false });
        if (Array.isArray(res)) {
          routes = res;
        } else if (res.data) {
          var total = res.total;
          while (total > routes.length) {
            res = await feathers.service("routes").find({ query: { _id: { $in: routeIds }, $skip: routes.length } });
            if (res.data.length === 0) break;
            routes.push(...res.data);
          }
        }
        setRoutes(routes);

        if (mapRef.current) {
          if (Platform.OS !== "ios") {
            const bound = getBoundaries(points);
            mapRef.current.setMapBoundaries?.(bound.northEast, bound.southWest);
          }
          mapRef.current.getCamera().then((camera) => setHeading(camera.heading));
        }
      } catch (error) {
        console.warn("init map error:", error);
      } finally {
        setLoaded(true);
      }
    }
    init();
  }, []);

  // Watch focusPoint
  useEffect(() => {
    if (mapRef.current && focusPoint) {
      if (isAnimate.current) return;

      if (focusIndex !== -1) {
        const focus = points[focusIndex];

        isAnimate.current = true;
        mapRef.current.animateToRegion({
          latitude: focus?.latitude,
          longitude: focus?.longitude,
          latitudeDelta: 0.004,
          longitudeDelta: 0.004,
        });
        isAnimate.current = false;
      }
    }
    if (routeListRef.current && focusPoint) {
      routeListRef.current.scrollToIndex({ animated: true, index: focusIndex, viewPosition: 0.5 });
    }
  }, [focusPoint]);

  // Watch init latitude and longitude
  useEffect(() => {
    if (mapRef.current && focusPoint) {
      if (isAnimate.current) return;
      if (!!latitude && !!longitude) {
        isAnimate.current = true;
        try {
          mapRef.current.animateToRegion({
            latitude: Number(latitude),
            longitude: Number(longitude),
            latitudeDelta: 0.004,
            longitudeDelta: 0.004,
          });
        } finally {
          isAnimate.current = false;
        }
      }
    }
  }, [latitude, longitude]);

  const onMapPress = () => {
    // close all bottom sheets
    setDetailOpen(false);
    setListOpen(false);
  };

  const getItemId = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / (ITEM_WIDTH + ITEM_SPACING));
    setFocusPoint(points[index]._id);
  };

  return (
    <MainBody padding={{ right: 0, left: 0 }}>
      {!loaded ? (
        <View style={style.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <View>
          <MapView
            ref={mapRef}
            style={style.map}
            initialRegion={{
              ...initPoint,
              latitudeDelta: 0.009,
              longitudeDelta: 0.009,
            }}
            mapType="satellite"
            userInterfaceStyle="dark"
            minZoomLevel={10}
            onPress={onMapPress}
            showsCompass
            showsUserLocation
            showsMyLocationButton={false}
            rotateEnabled={false}
            onRegionChangeComplete={(region) => {
              if (!isAnimate.current && isIOS) {
                let needUpdate = false;
                const newRegion = { ...region };
                if (region.latitude > bound.northEast.latitude) {
                  newRegion.latitude = bound.northEast.latitude - 0.00001;
                  needUpdate = true;
                }
                if (region.latitude < bound.southWest.latitude) {
                  newRegion.latitude = bound.southWest.latitude - 0.00001;
                  needUpdate = true;
                }
                if (region.longitude > bound.northEast.longitude) {
                  newRegion.longitude = bound.northEast.longitude + 0.00001;
                  needUpdate = true;
                }
                if (region.longitude < bound.southWest.longitude) {
                  newRegion.longitude = bound.southWest.longitude + 0.00001;
                  needUpdate = true;
                }
                if (mapRef.current && needUpdate) {
                  isAnimate.current = true;
                  mapRef.current.animateToRegion(newRegion);
                }
              } else {
                isAnimate.current = false;
              }
            }}
          >
            {routes.map((route) => (
              <ArrowLine
                key={route._id}
                coordinates={points.filter((point) => point.route === route._id)}
                strokeWidth={6}
                strokeColor={theme.colors.tertiary}
                arrowSize={20}
                heading={heading}
              />
            ))}
            {points.map((point) => (
              <Marker
                key={point._id}
                coordinate={{ latitude: point.latitude, longitude: point.longitude }}
                onPress={() => setFocusPoint(point._id)}
                onCalloutPress={() => setDetailOpen(true)}
                zIndex={10}
              >
                <MarkerCallout title={point.name} desc={point.desc} image={point.images?.[0]} />
              </Marker>
            ))}
          </MapView>
          {/* Point pickers */}
          {points.length && (
            <Animated.View style={cardListStyle}>
              <FlatList
                ref={routeListRef}
                snapToInterval={ITEM_WIDTH + ITEM_SPACING}
                pagingEnabled={true}
                decelerationRate={"fast"}
                horizontal
                ItemSeparatorComponent={() => <View style={{ width: ITEM_SPACING }} />}
                data={points}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => <ExploreItem points={points.filter((point) => point.route === item.route)} id={item._id} />}
                onMomentumScrollEnd={getItemId}
                contentContainerStyle={style.listContainer}
                onScrollToIndexFailed={(info) => {
                  const wait = new Promise((resolve) => setTimeout(resolve, 500));
                  wait.then(() => {
                    routeListRef.current?.scrollToIndex({
                      index: info.index,
                      animated: false,
                    });
                  });
                }}
                showsHorizontalScrollIndicator={false}
              />
            </Animated.View>
          )}

          <View style={style.buttonsContainer}>
            <IconBtn
              style={style.iconButton}
              icon="location"
              iconProps={{ fill: theme.colors.text }}
              onPress={async () => {
                if (!mapRef.current) return;
                const { coords } = await getCurrentPositionAsync();
                isAnimate.current = true;
                try {
                  mapRef.current.animateToRegion({
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    latitudeDelta: 0.004,
                    longitudeDelta: 0.004,
                  });
                } finally {
                  isAnimate.current = false;
                }
              }}
            />
            <IconBtn
              style={style.iconButton}
              icon="createAR"
              iconProps={{ fill: theme.colors.text }}
              onPress={() => {
                router.push("/ar_explore");
              }}
            />
            <IconBtn
              square
              style={style.iconButton}
              icon="menu"
              iconProps={{ fill: theme.colors.text }}
              onPress={() => {
                setListOpen((prev) => !prev);
              }}
            />
          </View>
          <ExploreListModal open={listOpen} setOpen={setListOpen} data={points} />
          <ExploreModal open={detailOpen} setOpen={setDetailOpen} data={points[focusIndex]} />
        </View>
      )}
    </MainBody>
  );
}

const useStyle = ({ spacing, screenWidth }: { spacing: any; screenWidth: number }) =>
  StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignContent: "center" },
    map: {
      height: "100%",
      width: "100%",
    },
    list: {
      position: "absolute",
      bottom: 86 + spacing.md,
    },
    listContainer: {
      paddingHorizontal: (screenWidth - ITEM_WIDTH) / 2,
    },
    buttonsContainer: {
      position: "absolute",
      bottom: 86 + spacing.md + 120 + spacing.md,
      right: spacing.lg,
    },
    iconButton: {
      marginTop: spacing.md,
    },
  });
