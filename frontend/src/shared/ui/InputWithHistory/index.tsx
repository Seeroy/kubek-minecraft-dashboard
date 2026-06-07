"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui/input";
import { ScrollArea } from "@/shared/ui/scroll-area";
import React, {
  ChangeEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

interface InputWithHistoryProps {
  maxHistory?: number;
  onInputKeydown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onInputChange?: (value: string) => void;
  onInputSubmit?: (value: string) => void;
  inputClassName?: string;
  suggestionsClassName?: string;
  disabled?: boolean;
  placeholder?: string;
  extraSuggestions?: string[];
}

const InputWithHistory: React.FC<InputWithHistoryProps> = ({
  maxHistory = 20,
  onInputKeydown = () => {},
  onInputChange = () => {},
  onInputSubmit = () => {},
  inputClassName,
  suggestionsClassName,
  disabled = false,
  placeholder,
  extraSuggestions = [],
}) => {
  const { t } = useTranslation("modules.components");
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onInputChange(value);
  }, [value, onInputChange]);

  // Close the suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsSuggestionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateSuggestions = (inputValue: string) => {
    // Filter history suggestions by the input prefix
    const filteredHistory = history.filter((item) =>
      item.toLowerCase().startsWith(inputValue.toLowerCase())
    );

    // For extra suggestions (players) match against the last word
    const lastWord = inputValue.split(" ").pop() || "";
    const filteredExtra = extraSuggestions.filter((item) =>
      item.toLowerCase().startsWith(lastWord.toLowerCase())
    );

    // Merge and dedupe, history takes priority
    const combinedSuggestions = [
      ...filteredHistory,
      ...filteredExtra.filter((item) => !filteredHistory.includes(item)),
    ];

    setSuggestions(combinedSuggestions);
    setIsSuggestionsOpen(
      combinedSuggestions.length > 0 && inputValue.length > 0
    );
    setSelectedSuggestionIndex(-1);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    updateSuggestions(newValue);
  };

  const handleInputSubmit = () => {
    if (value.trim() === "") return;

    // Add the value to history if not already present
    setHistory((prevHistory) => {
      const updatedHistory = [
        value,
        ...prevHistory.filter((item) => item !== value),
      ];
      return updatedHistory.slice(0, maxHistory);
    });

    onInputSubmit(value);
    setValue("");
    setSuggestions([]);
    setIsSuggestionsOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    onInputKeydown(e);

    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (isSuggestionsOpen && suggestions.length > 0) {
        // If suggestions are open, pick the active one or the first
        const indexToSelect =
          selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0;
        const selectedSuggestion = suggestions[indexToSelect];
        const isExtraSuggestion = extraSuggestions.includes(selectedSuggestion);
        if (isExtraSuggestion && value.includes(" ")) {
          const words = value.split(" ");
          words[words.length - 1] = selectedSuggestion;
          setValue(words.join(" "));
        } else {
          setValue(selectedSuggestion);
        }
        setIsSuggestionsOpen(false);
        setSelectedSuggestionIndex(-1);
      } else if (e.key === "Enter") {
        handleInputSubmit();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsSuggestionsOpen(true);
      setSelectedSuggestionIndex((prevIndex) =>
        prevIndex > 0 ? prevIndex - 1 : suggestions.length - 1
      );
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsSuggestionsOpen(true);
      setSelectedSuggestionIndex((prevIndex) =>
        prevIndex < suggestions.length - 1 ? prevIndex + 1 : 0
      );
    } else if (e.key === "Backspace" && value === "") {
      setIsSuggestionsOpen(false);
    } else if (e.key === "Escape") {
      setIsSuggestionsOpen(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // For an extra (player) suggestion, replace the last word
    const isExtraSuggestion = extraSuggestions.includes(suggestion);
    if (isExtraSuggestion && value.includes(" ")) {
      const words = value.split(" ");
      words[words.length - 1] = suggestion;
      setValue(words.join(" "));
    } else {
      setValue(suggestion);
    }
    setSuggestions([]);
    setIsSuggestionsOpen(false);
    inputRef.current?.focus();
  };

  // Sync the input text when the selected suggestion changes
  useEffect(() => {
    if (
      selectedSuggestionIndex >= 0 &&
      selectedSuggestionIndex < suggestions.length
    ) {
      const selectedSuggestion = suggestions[selectedSuggestionIndex];
      const isExtraSuggestion = extraSuggestions.includes(selectedSuggestion);
      if (isExtraSuggestion && value.includes(" ")) {
        const words = value.split(" ");
        words[words.length - 1] = selectedSuggestion;
        setValue(words.join(" "));
      } else {
        setValue(selectedSuggestion);
      }
    }
  }, [selectedSuggestionIndex, suggestions, extraSuggestions, value]);

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder || t("inputWithHistory.placeholder")}
        value={value}
        disabled={disabled}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value.length > 0) {
            updateSuggestions(value);
          }
        }}
        className={cn("w-full transition-colors", inputClassName)}
      />

      {isSuggestionsOpen && suggestions.length > 0 && (
        <div
          className={cn(
            "absolute right-0 bottom-full left-0 z-50 mb-1",
            suggestionsClassName
          )}
        >
          <ScrollArea className="h-auto max-h-32 rounded-md border bg-popover shadow-md">
            <div className="p-1">
              {suggestions.map((suggestion, index) => {
                const isPlayerSuggestion =
                  extraSuggestions.includes(suggestion);
                return (
                  <div
                    key={`${suggestion}-${index}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={cn(
                      "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground",
                      index === selectedSuggestionIndex &&
                        "bg-accent text-accent-foreground"
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {isPlayerSuggestion && (
                      <img
                        src={`https://minotar.net/avatar/${suggestion}/20`}
                        alt={suggestion}
                        className="h-5 w-5 flex-shrink-0 rounded-full"
                      />
                    )}
                    {suggestion}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default InputWithHistory;
