import { Text, Button } from "react-native-paper";
import { useRouter } from "expo-router";
import { StyleSheet, View, FlatList, Modal } from "react-native";
import MapView from "react-native-maps";
import { Dimensions } from "react-native";
import { useAppTheme } from "../../styles";
import MainBody from "../../components/main_body";
import IconBtn from "../../components/icon_btn";
import GPSIcon from "../../assets/icons/gps.svg";
import BookMarkOutlineIcon from "../../assets/icons/bookmark-outline.svg";
import BookMarkIcon from "../../assets/icons/bookmark.svg";
import CreateARIcon from "../../assets/icons/create-ar.svg";
import LocateARIcon from "../../assets/icons/locate.svg";
import MenuIcon from "../../assets/icons/menu.svg";
import { useState } from "react";

interface ItemProps {
  title: string;
  length: number; // in km
  isSaved: boolean;
}

const DATA = [
  {
    title: "First Path",
    length: 10,
    save: true,
  },
  {
    title: "Second Path",
    length: 15,
    save: false,
  },
  {
    title: "Third Path",
    length: 30,
    save: true,
  },
];

export default function Explore() {
  const theme = useAppTheme();
  const router = useRouter();

  const itemWidth = 270;
  const itemSpacing = 10;
  const window = { height: Dimensions.get("window").height, width: Dimensions.get("window").width };
  const _style = useStyle({
    backgroundColor: theme.colors.grey4,
    labelGrey: theme.colors.label,
    spacing: theme.spacing,
    itemWidth,
    window,
  });

  const [open, setOpen] = useState(false);

  const Item = ({ title, length, isSaved }: ItemProps) => (
    <View style={_style.item}>
      <>
        <Text variant="labelMedium">{title}</Text>
        <Text variant="labelSmall" style={_style.lengthText}>
          {length} km
        </Text>
      </>
      <View style={{ display: "flex", flexDirection: "row" }}>
        <Button
          compact
          labelStyle={_style.button}
          textColor={theme.colors.grey1}
          mode="contained"
          icon={() => <GPSIcon fill="white" style={_style.icon} />}
        >
          <Text variant="labelSmall">Start</Text>
        </Button>
        <Button
          compact
          labelStyle={_style.button}
          mode="outlined"
          icon={() =>
            isSaved ? (
              <BookMarkIcon style={_style.icon} fill={theme.colors.primary} />
            ) : (
              <BookMarkOutlineIcon style={_style.icon} fill={theme.colors.primary} />
            )
          }
          style={{ marginLeft: 8, borderColor: theme.colors.primary }}
        >
          <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
            {isSaved ? "Saved" : "Save"}
          </Text>
        </Button>
      </View>
    </View>
  );

  return (
    <MainBody>
      <>
        <MapView
          style={_style.map}
          initialRegion={{
            latitude: 22.2831,
            longitude: 114.1366,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        />
        <FlatList
          snapToInterval={270 + itemSpacing}
          pagingEnabled={true}
          decelerationRate={"fast"}
          horizontal
          ItemSeparatorComponent={() => <View style={{ width: itemSpacing }} />}
          style={_style.list}
          data={DATA}
          renderItem={({ item }) => <Item title={item.title} length={item.length} isSaved={item.save} />}
          contentContainerStyle={_style.listContainer}
        />
        <View style={_style.buttonsContainer}>
          <IconBtn style={_style.iconButton} icon={<LocateARIcon fill={theme.colors.grey1} />} onPress={() => {}} />
          <IconBtn style={_style.iconButton} icon={<CreateARIcon fill={theme.colors.grey1} />} onPress={() => {}} />
          <IconBtn square style={_style.iconButton} icon={<MenuIcon fill={theme.colors.grey1} />} onPress={() => setOpen(!open)} />
        </View>
        <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
          <View style={{ height: window.height, backgroundColor: "rgba(54, 54, 54, 0.6)" }} />
          <View style={_style.modal}>
            <View style={{ width: "100%", alignItems: "center", justifyContent: "center", height: theme.spacing.xl }}>
              <View style={{ backgroundColor: "black", height: 4, width: 72 }} />
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
              test
            </Text>
          </View>
        </Modal>
      </>
    </MainBody>
  );
}

const useStyle = ({ backgroundColor, spacing, itemWidth, window, labelGrey }: any) =>
  StyleSheet.create({
    item: {
      backgroundColor: backgroundColor,
      width: itemWidth,
      height: 96,
      borderRadius: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      justifyContent: "space-between",
    },
    lengthText: {
      color: labelGrey,
      marginTop: -9,
    },
    map: {
      height: "100%",
      width: "100%",
    },
    list: {
      position: "absolute",
      bottom: 86 + spacing.md,
    },
    listContainer: {
      paddingHorizontal: (window.width - itemWidth) / 2,
    },
    button: {
      marginVertical: 4,
      fontSize: 8,
    },
    icon: {
      maxHeight: 16,
      marginHorizontal: -6,
    },
    buttonsContainer: {
      position: "absolute",
      bottom: 86 + spacing.md + 96 + spacing.md,
      right: spacing.lg,
    },
    iconButton: {
      marginTop: spacing.md,
    },
    modal: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: window.height * 0.6,
      backgroundColor: backgroundColor,
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
    },
  });
