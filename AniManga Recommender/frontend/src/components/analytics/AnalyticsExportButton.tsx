// ABOUTME: Analytics export button component for exporting dashboard data
// ABOUTME: Supports multiple formats (JSON, CSV, PDF) with progress tracking

import React, { useState } from "react";
import { ListAnalyticsData, AnalyticsTimeRange } from "../../types/analytics";
import { format } from "date-fns";
import { logger } from "../../utils/logger";
import "./AnalyticsExportButton.css";

interface AnalyticsExportButtonProps {
  analyticsData: ListAnalyticsData | null;
  timeRange: AnalyticsTimeRange;
  isLoading?: boolean;
  className?: string;
}

type ExportFormat = "json" | "csv" | "pdf";

export const AnalyticsExportButton: React.FC<AnalyticsExportButtonProps> = ({
  analyticsData,
  timeRange,
  isLoading = false,
  className = "",
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
  const [showDropdown, setShowDropdown] = useState(false);

  const isDisabled = isLoading || !analyticsData || isExporting;

  const generateFilename = (fileFormat: ExportFormat): string => {
    const startDate = format(timeRange.start, "yyyy-MM-dd");
    const endDate = format(timeRange.end, "yyyy-MM-dd");
    const timestamp = format(new Date(), "yyyy-MM-dd-HHmm");
    return `analytics-${startDate}-to-${endDate}-${timestamp}.${fileFormat}`;
  };

  const exportAsJSON = async (): Promise<void> => {
    if (!analyticsData) return;

    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        timeRange: {
          start: timeRange.start.toISOString(),
          end: timeRange.end.toISOString(),
          granularity: timeRange.granularity,
        },
        version: "1.0",
      },
      analytics: analyticsData,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    downloadFile(blob, generateFilename("json"));
  };

  const exportAsCSV = async (): Promise<void> => {
    if (!analyticsData) return;

    const csvLines: string[] = [];

    // Header
    csvLines.push("# AniManga Analytics Export");
    csvLines.push(`# Generated: ${new Date().toISOString()}`);
    csvLines.push(`# Time Range: ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`);
    csvLines.push("");

    // Overview metrics
    csvLines.push("## Overview Metrics");
    csvLines.push("Metric,Value");
    csvLines.push(`Total Items,${analyticsData.overview.totalItems}`);
    csvLines.push(`Completed Items,${analyticsData.overview.completedItems}`);
    csvLines.push(`Average Rating,${analyticsData.overview.averageRating}`);
    csvLines.push(`Total Hours Watched,${analyticsData.overview.totalHoursWatched}`);
    csvLines.push(`Completion Rate,${analyticsData.overview.completionRate}`);
    csvLines.push(`Active Streak,${analyticsData.overview.activeStreak}`);
    csvLines.push(`Longest Streak,${analyticsData.overview.longestStreak}`);
    csvLines.push("");

    // Rating distribution
    csvLines.push("## Rating Distribution");
    csvLines.push("Rating,Count,Percentage");
    analyticsData.ratingDistribution.forEach((item) => {
      csvLines.push(`${item.rating},${item.count},${item.percentage.toFixed(2)}%`);
    });
    csvLines.push("");

    // Status breakdown
    csvLines.push("## Status Breakdown");
    csvLines.push("Status,Count,Percentage");
    analyticsData.statusBreakdown.forEach((item) => {
      csvLines.push(`${item.status},${item.count},${item.percentage.toFixed(2)}%`);
    });
    csvLines.push("");

    // Timeline data
    csvLines.push("## Completion Timeline");
    csvLines.push("Date,Value");
    analyticsData.completionTimeline.forEach((item) => {
      csvLines.push(`${item.date},${item.value}`);
    });

    const blob = new Blob([csvLines.join("\n")], {
      type: "text/csv",
    });

    downloadFile(blob, generateFilename("csv"));
  };

  const exportAsPDF = async (): Promise<void> => {
    // For now, we'll create a simple HTML version that can be printed as PDF
    // In a full implementation, you'd use a library like jsPDF or puppeteer

    if (!analyticsData) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AniManga Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
            .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .metric-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
            .metric-label { font-size: 14px; color: #666; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .section { margin: 30px 0; }
            .section h2 { color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AniManga Analytics Report</h1>
            <p>Generated on ${format(new Date(), "MMMM d, yyyy")}</p>
            <p>Time Period: ${format(timeRange.start, "MMM d, yyyy")} - ${format(
      timeRange.end,
      "MMM d, yyyy"
    )}</p>
          </div>

          <div class="section">
            <h2>Overview Metrics</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-value">${analyticsData.overview.totalItems}</div>
                <div class="metric-label">Total Items</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${analyticsData.overview.completedItems}</div>
                <div class="metric-label">Completed Items</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${analyticsData.overview.averageRating.toFixed(1)}/10</div>
                <div class="metric-label">Average Rating</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${analyticsData.overview.totalHoursWatched}h</div>
                <div class="metric-label">Hours Watched</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${(analyticsData.overview.completionRate * 100).toFixed(1)}%</div>
                <div class="metric-label">Completion Rate</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${analyticsData.overview.activeStreak} days</div>
                <div class="metric-label">Current Streak</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Rating Distribution</h2>
            <table>
              <thead>
                <tr><th>Rating</th><th>Count</th><th>Percentage</th></tr>
              </thead>
              <tbody>
                ${analyticsData.ratingDistribution
                  .map(
                    (item) =>
                      `<tr><td>${item.rating}/10</td><td>${item.count}</td><td>${item.percentage.toFixed(
                        1
                      )}%</td></tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Status Breakdown</h2>
            <table>
              <thead>
                <tr><th>Status</th><th>Count</th><th>Percentage</th></tr>
              </thead>
              <tbody>
                ${analyticsData.statusBreakdown
                  .map(
                    (item) =>
                      `<tr><td>${item.status.replace("_", " ")}</td><td>${
                        item.count
                      }</td><td>${item.percentage.toFixed(1)}%</td></tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    downloadFile(blob, generateFilename("pdf"));

    // Show instruction to user
    alert("HTML report downloaded. You can open it in your browser and print to PDF using Ctrl+P or Cmd+P.");
  };

  const downloadFile = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (): Promise<void> => {
    if (isDisabled) return;

    try {
      setIsExporting(true);
      setShowDropdown(false);

      switch (exportFormat) {
        case "json":
          await exportAsJSON();
          break;
        case "csv":
          await exportAsCSV();
          break;
        case "pdf":
          await exportAsPDF();
          break;
      }
    } catch (error: any) {
      logger.error("Export failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "AnalyticsExportButton",
        operation: "handleExport",
        exportFormat: exportFormat
      });
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions = [
    { value: "json" as const, label: "JSON", description: "Raw data in JSON format" },
    { value: "csv" as const, label: "CSV", description: "Spreadsheet-compatible format" },
    { value: "pdf" as const, label: "PDF", description: "Formatted report (HTML)" },
  ];

  return (
    <div className={`analytics-export ${className}`}>
      <div className="export-button-group">
        <button onClick={handleExport} disabled={isDisabled} className="export-btn primary">
          {isExporting ? (
            <>
              <span className="spinner"></span>
              Exporting...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
              </svg>
              Export
            </>
          )}
        </button>

        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={isDisabled}
          className="format-selector"
        >
          {exportFormat.toUpperCase()}
          <svg
            className={`chevron ${showDropdown ? "expanded" : ""}`}
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
      </div>

      {showDropdown && (
        <div className="format-dropdown">
          {formatOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setExportFormat(option.value);
                setShowDropdown(false);
              }}
              className={`format-option ${exportFormat === option.value ? "active" : ""}`}
            >
              <div className="format-label">{option.label}</div>
              <div className="format-description">{option.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
