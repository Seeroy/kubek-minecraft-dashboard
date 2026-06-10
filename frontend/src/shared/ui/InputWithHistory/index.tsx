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
  /** TAB asks the server's own line editor to complete the line, undefined disables it */
  onRequestCompletion?: (
    line: string
  ) => Promise<{ completion: string; candidates: string[] }>;
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
  onRequestCompletion,
}) => {
  const { t } = useTranslation("modules.components");
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  // True while the open dropdown holds server completion candidates (last-token replace)
  const completionModeRef = useRef(false);
  // True while a server completion request is in flight, so TAB does not stack requests
  const completionPendingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply a chosen suggestion: server candidates and player names replace the last
  // word, history entries replace the whole line
  const applySuggestion = (suggestion: string): string => {
    const lastWord =
      completionModeRef.current || extraSuggestions.includes(suggestion);
    if (lastWord && value.includes(" ")) {
      const words = value.split(" ");
      words[words.length - 1] = suggestion;
      return words.join(" ");
    }
    return suggestion;
  };

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

    completionModeRef.current = false;
    setSuggestions(combinedSuggestions);
    setIsSuggestionsOpen(
      combinedSuggestions.length > 0 && inputValue.length > 0
    );
    setSelectedSuggestionIndex(-1);
  };

  // Ask the server to complete the line, apply the inline result and show candidates
  const runServerCompletion = async () => {
    if (!onRequestCompletion || completionPendingRef.current) return;
    completionPendingRef.current = true;
    try {
      const current = value;
      const { completion, candidates } = await onRequestCompletion(current);
      if (completion && completion !== current) setValue(completion);
      if (candidates.length > 1) {
        completionModeRef.current = true;
        setSuggestions(candidates);
        setIsSuggestionsOpen(true);
        setSelectedSuggestionIndex(-1);
      } else {
        completionModeRef.current = false;
        setIsSuggestionsOpen(false);
      }
    } finally {
      completionPendingRef.current = false;
    }
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
      // An open dropdown accepts the active (or first) suggestion
      if (isSuggestionsOpen && suggestions.length > 0) {
        e.preventDefault();
        const indexToSelect =
          selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0;
        setValue(applySuggestion(suggestions[indexToSelect]));
        completionModeRef.current = false;
        setIsSuggestionsOpen(false);
        setSelectedSuggestionIndex(-1);
        return;
      }
      // TAB with no dropdown asks the server's line editor to complete
      if (e.key === "Tab") {
        e.preventDefault();
        if (onRequestCompletion) void runServerCompletion();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
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
    setValue(applySuggestion(suggestion));
    completionModeRef.current = false;
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
      setValue(applySuggestion(suggestions[selectedSuggestionIndex]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSuggestionIndex, suggestions, extraSuggestions]);

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
