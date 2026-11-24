import { useState } from "react";
import styles from "./AvatarEditor.module.scss";

export type Avatar = {
  style: "girl" | "man";
  face: number;
  eyes: number;
  nose: number;
  mouth: number;
  brows: number;
  backHair: number;
  frontHair: number;
  clothes: number;
  glasses: number;
  extra: number;
  skin: string;
  hair: string;
  outfit: string;
  browColor: string;
  glassesColor: string;
  extraColor: string;
  mouthColor: string;
};
export const defaultAvatar: Avatar = {
  style: "girl",
  face: 2,
  eyes: 1,
  nose: 1,
  mouth: 1,
  brows: 1,
  backHair: 1,
  frontHair: 1,
  clothes: 1,
  glasses: 0,
  extra: 0,
  skin: "#f6bd8e",
  hair: "#5c2d0f",
  outfit: "#288b67",
  browColor: "#5c2d0f",
  glassesColor: "#181615",
  extraColor: "#5c2d0f",
  mouthColor: "#bb1639",
};

export function normalizeAvatar(value: Partial<Avatar> | null): Avatar {
  if (!value) return { ...defaultAvatar };
  return {
    ...defaultAvatar,
    ...value,
    browColor: value.browColor ?? value.hair ?? defaultAvatar.browColor,
    glassesColor: value.glassesColor ?? defaultAvatar.glassesColor,
    extraColor: value.extraColor ?? value.hair ?? defaultAvatar.extraColor,
    mouthColor: value.mouthColor ?? defaultAvatar.mouthColor,
  };
}

type Part =
  | "face"
  | "eyes"
  | "nose"
  | "mouth"
  | "brows"
  | "backHair"
  | "frontHair"
  | "clothes"
  | "glasses"
  | "extra";
type Category = Part | "style";
type ColorKey =
  | "skin"
  | "hair"
  | "outfit"
  | "browColor"
  | "glassesColor"
  | "extraColor"
  | "mouthColor";
const skinColors = [
  "#f9d4b4",
  "#f6bd8e",
  "#dfaa84",
  "#bf8863",
  "#966342",
  "#674431",
];
const hairColors = [
  "#181615",
  "#5c2d0f",
  "#a65b36",
  "#e8c978",
  "#eaeaea",
  "#d888c2",
];
const accessoryColors = [
  "#181615",
  "#5c2d0f",
  "#d4a744",
  "#eaeaea",
  "#d888c2",
  "#7499d8",
];
const outfitColors = [
  "#288b67",
  "#ff6062",
  "#facdda",
  "#3e4eb2",
  "#e5cf3c",
  "#181615",
];
const mouthColors = [
  "#bb1639",
  "#df6d78",
  "#9a3947",
  "#b46c56",
  "#82504a",
  "#d888c2",
];
export function AvatarEditor({
  value,
  onChange,
}: {
  value: Avatar;
  onChange: (value: Avatar) => void;
}) {
  const [selected, setSelected] = useState<Category>("style");
  const girl = value.style === "girl";
  const parts: {
    key: Part;
    label: string;
    count: number;
    optional?: boolean;
  }[] = [
    { key: "face", label: "Лицо", count: 3 },
    { key: "eyes", label: "Глаза", count: girl ? 4 : 5 },
    { key: "nose", label: "Нос", count: girl ? 4 : 5 },
    { key: "mouth", label: "Рот", count: girl ? 5 : 4 },
    { key: "brows", label: "Брови", count: 4 },
    { key: "backHair", label: "Волосы", count: 9 },
    { key: "frontHair", label: "Чёлка", count: 9 },
    { key: "clothes", label: "Одежда", count: girl ? 6 : 3 },
    { key: "glasses", label: "Очки", count: 4, optional: true },
    {
      key: "extra",
      label: girl ? "Серьги" : "Борода",
      count: girl ? 4 : 5,
      optional: true,
    },
  ];
  const categories: { key: Category; label: string }[] = [
    { key: "style", label: "Основа" },
    ...parts,
  ];
  const part = parts.find((item) => item.key === selected);
  const partColor: { key: ColorKey; label: string; presets: string[] } | null =
    selected === "face"
      ? { key: "skin", label: "Цвет кожи", presets: skinColors }
      : selected === "backHair" || selected === "frontHair"
        ? { key: "hair", label: "Цвет волос", presets: hairColors }
        : selected === "clothes"
          ? { key: "outfit", label: "Цвет одежды", presets: outfitColors }
          : selected === "brows"
            ? { key: "browColor", label: "Цвет бровей", presets: hairColors }
            : selected === "glasses"
              ? {
                  key: "glassesColor",
                  label: "Цвет очков",
                  presets: accessoryColors,
                }
              : selected === "extra"
                ? {
                    key: "extraColor",
                    label: girl ? "Цвет серёг" : "Цвет бороды",
                    presets: girl ? accessoryColors : hairColors,
                  }
                : selected === "mouth" && girl
                  ? {
                      key: "mouthColor",
                      label: "Цвет губ",
                      presets: mouthColors,
                    }
                  : null;
  function setColor(key: ColorKey, color: string) {
    onChange({
      ...value,
      [key]: color,
      ...(key === "hair" && !girl && value.extraColor === value.hair
        ? { extraColor: color }
        : {}),
    });
  }
  function setStyle(style: Avatar["style"]) {
    onChange({
      ...defaultAvatar,
      style,
      skin: value.skin,
      hair: value.hair,
      outfit: value.outfit,
      browColor: value.browColor,
      glassesColor: value.glassesColor,
      extraColor: style === "man" ? value.hair : value.extraColor,
      mouthColor: value.mouthColor,
    });
  }
  return (
    <div className={styles.editor} role="group" aria-label="Настройки аватарки">
      <AvatarPreview value={value} />
      <div
        className={styles.categories}
        role="group"
        aria-label="Часть аватарки"
      >
        {categories.map((category) => (
          <button
            type="button"
            key={category.key}
            className={
              selected === category.key
                ? styles.activeCategory
                : styles.category
            }
            aria-pressed={selected === category.key}
            onClick={() => setSelected(category.key)}
          >
            {category.label}
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        {selected === "style" && (
          <div className={styles.options}>
            {(["girl", "man"] as const).map((style, index) => (
              <button
                type="button"
                key={style}
                className={
                  value.style === style ? styles.activeOption : styles.option
                }
                aria-label={`Основа: вариант ${index + 1}`}
                aria-pressed={value.style === style}
                onClick={() => setStyle(style)}
              >
                <AvatarPreview
                  value={{
                    ...defaultAvatar,
                    style,
                    skin: value.skin,
                    hair: value.hair,
                    outfit: value.outfit,
                  }}
                />
              </button>
            ))}
          </div>
        )}
        {part && (
          <>
            {partColor && (
              <div
                className={styles.partColor}
                role="group"
                aria-label={partColor.label}
              >
                <span className={styles.colorTitle}>{partColor.label}</span>
                <div className={styles.swatches}>
                  {partColor.presets.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={styles.swatch}
                      style={{ backgroundColor: color }}
                      aria-label={`${partColor.label}: ${color}`}
                      aria-pressed={
                        value[partColor.key].toLowerCase() ===
                        color.toLowerCase()
                      }
                      onClick={() => setColor(partColor.key, color)}
                    />
                  ))}
                  <label
                    className={styles.palette}
                    data-active={
                      !partColor.presets.some(
                        (color) =>
                          color.toLowerCase() ===
                          value[partColor.key].toLowerCase(),
                      )
                    }
                    title="Выбрать другой цвет"
                  >
                    <span className={styles.paletteText}>Другой цвет</span>
                    <input
                      type="color"
                      aria-label={`${partColor.label}: выбрать другой цвет`}
                      value={value[partColor.key]}
                      onChange={(event) =>
                        setColor(partColor.key, event.target.value)
                      }
                    />
                  </label>
                </div>
              </div>
            )}
            <div className={styles.options}>
              {part.optional && (
                <button
                  type="button"
                  className={
                    value[part.key] === 0 ? styles.activeOption : styles.option
                  }
                  aria-pressed={value[part.key] === 0}
                  onClick={() => onChange({ ...value, [part.key]: 0 })}
                >
                  Нет
                </button>
              )}
              {Array.from({ length: part.count }, (_, index) => {
                const number = index + 1;
                return (
                  <button
                    type="button"
                    key={number}
                    className={
                      value[part.key] === number
                        ? styles.activeOption
                        : styles.option
                    }
                    aria-label={`${part.label}: вариант ${number}`}
                    aria-pressed={value[part.key] === number}
                    onClick={() => onChange({ ...value, [part.key]: number })}
                  >
                    <AvatarPreview value={{ ...value, [part.key]: number }} />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function AvatarPreview({ value: input }: { value: Avatar }) {
  const value = normalizeAvatar(input);
  const girl = value.style === "girl";
  const url = (part: string, num?: number) =>
    `${import.meta.env.BASE_URL}avatar/${value.style}-svg/${part}${num === undefined ? "" : `/${num}`}.svg`;
  const mask = (part: string, num: number | undefined, color: string) => ({
    backgroundColor: color,
    maskImage: `url("${url(part, num)}")`,
    WebkitMaskImage: `url("${url(part, num)}")`,
  });
  return (
    <div className={styles.preview} aria-label="Предпросмотр аватарки">
      <div
        className={styles.layer}
        style={mask("backHair", value.backHair, value.hair)}
      />
      <div
        className={styles.layer}
        style={mask("neck", undefined, value.skin)}
      />
      <div
        className={styles.layer}
        style={mask("clothes", value.clothes, value.outfit)}
      />
      <div
        className={styles.layer}
        style={mask("face", value.face, value.skin)}
      />
      <img className={styles.layer} src={url("eyes", value.eyes)} alt="" />
      <img className={styles.layer} src={url("nose", value.nose)} alt="" />
      {girl ? (
        <div
          className={styles.layer}
          style={mask("mouth", value.mouth, value.mouthColor)}
        />
      ) : (
        <img className={styles.layer} src={url("mouth", value.mouth)} alt="" />
      )}
      <div
        className={styles.layer}
        style={mask("brows", value.brows, value.browColor)}
      />
      {!(value.style === "man" && value.backHair === 9) && (
        <div
          className={styles.layer}
          style={mask("frontHair", value.frontHair, value.hair)}
        />
      )}
      {!!value.extra && (
        <div
          className={styles.layer}
          style={mask(
            girl ? "earrings" : "beard",
            value.extra,
            value.extraColor,
          )}
        />
      )}
      {!!value.glasses && (
        <div
          className={styles.layer}
          style={mask("glasses", value.glasses, value.glassesColor)}
        />
      )}
    </div>
  );
}
