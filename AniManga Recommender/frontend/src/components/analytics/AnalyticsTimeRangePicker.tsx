// ABOUTME: Time range picker component for analytics filtering
// ABOUTME: Provides date inputs, granularity selector, and validation

import React, { useState } from "react";
import { AnalyticsTimeRange } from "../../types/analytics";
import { format, isValid, parseISO, startOfDay, endOfDay } from "date-fns";
import "./AnalyticsTimeRangePicker.css";

interface AnalyticsTimeRangePickerProps {
  timeRange: AnalyticsTimeRange;
  onChange: (timeRange: AnalyticsTimeRange) => void;
  className?: string;
}

export const AnalyticsTimeRangePicker: React.FC<AnalyticsTimeRangePickerProps> = ({
  timeRange,
  onChange,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tempRange, setTempRange] = useState(timeRange);

  const formatDateForInput = (date: Date): string => {
    return format(date, "yyyy-MM-dd");
  };

  const handleStartDateChange = (value: string) => {
    const date = parseISO(value);
    if (isValid(date)) {
      setTempRange((prev) => ({
        ...prev,
        start: startOfDay(date),
      }));
    }
  };

  const handleEndDateChange = (value: string) => {
    const date = parseISO(value);
    if (isValid(date)) {
      setTempRange((prev) => ({
        ...prev,
        end: endOfDay(date),
      }));
    }
  };

  const handleGranularityChange = (granularity: AnalyticsTimeRange["granularity"]) => {
    setTempRange((prev) => ({
      ...prev,
      granularity,
    }));
  };

  const handleApply = () => {
    // Validate date range
    if (tempRange.start > tempRange.end) {
      alert("Start date must be before end date");
      return;
    }

    onChange(tempRange);
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setTempRange(timeRange);
    setIsExpanded(false);
  };

  const granularityOptions = [
    { value: "day", label: "Daily" },
    { value: "week", label: "Weekly" },
    { value: "month", label: "Monthly" },
    { value: "quarter", label: "Quarterly" },
    { value: "year", label: "Yearly" },
  ] as const;

  return (
    <div className={`time-range-picker ${className}`}>
      <button onClick={() => setIsExpanded(!isExpanded)} className="time-range-trigger">
        <span className="date-range-display">
          {format(timeRange.start, "MMM d, yyyy")} - {format(timeRange.end, "MMM d, yyyy")}
        </span>
        <span className="granularity-display">({timeRange.granularity})</span>
        <svg
          className={`chevron ${isExpanded ? "expanded" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z" />
        </svg>
      </button>

      {isExpanded && (
        <div className="time-range-dropdown">
          <div className="dropdown-content">
            <div className="date-inputs">
              <div className="input-group">
                <label htmlFor="start-date">Start Date</label>
                <input
                  id="start-date"
                  type="date"
                  value={formatDateForInput(tempRange.start)}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  max={formatDateForInput(tempRange.end)}
                />
              </div>

              <div className="input-group">
                <label htmlFor="end-date">End Date</label>
                <input
                  id="end-date"
                  type="date"
                  value={formatDateForInput(tempRange.end)}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  min={formatDateForInput(tempRange.start)}
                  max={formatDateForInput(new Date())}
                />
              </div>
            </div>

            <div className="granularity-selector">
              <label>Granularity</label>
              <div className="granularity-options">
                {granularityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleGranularityChange(option.value)}
                    className={`granularity-btn ${tempRange.granularity === option.value ? "active" : ""}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="actions">
              <button onClick={handleCancel} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleApply} className="apply-btn">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
