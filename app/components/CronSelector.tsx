import React, { useState, useEffect } from 'react';
import { validateCronExpression, describeCronExpression, getNextRunTime } from '../lib/client/cronClient';

interface CronSelectorProps {
  value: string;
  onChange: (value: string) => void;
  showDescription?: boolean;
  showNextRun?: boolean;
  className?: string;
  compact?: boolean;
  minInterval?: number;
}

export default function CronSelector({ 
  value = '*/5 * * * *', 
  onChange, 
  showDescription = true,
  showNextRun = true,
  className = '',
  compact = false,
  minInterval = 1
}: CronSelectorProps) {
  const [selectedTab, setSelectedTab] = useState<'simple' | 'advanced'>('simple');
  const [isValid, setIsValid] = useState(true);
  const [nextRunTime, setNextRunTime] = useState<number | null>(null);
  const [cronDescription, setCronDescription] = useState<string>('');
  
  // Simple schedule options
  const [frequency, setFrequency] = useState<'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'>('minutes');
  const [minuteInterval, setMinuteInterval] = useState(5);
  const [hourTime, setHourTime] = useState('00:00');
  const [weekday, setWeekday] = useState(0); // Sunday
  const [monthDay, setMonthDay] = useState(1);

  // Validate and update description on value change
  useEffect(() => {
    const isValidExpression = validateCronExpression(value);
    setIsValid(isValidExpression);
    
    if (isValidExpression) {
      setCronDescription(describeCronExpression(value));
      if (showNextRun) {
        try {
          const nextRun = getNextRunTime(value);
          setNextRunTime(nextRun);
        } catch (error) {
          setNextRunTime(null);
        }
      }
    } else {
      setCronDescription('Invalid cron expression');
      setNextRunTime(null);
    }
  }, [value, showNextRun]);

  // Detect schedule type on initial load
  useEffect(() => {
    detectScheduleType(value);
  }, [value]);

  // Detect what type of schedule the current value represents
  const detectScheduleType = (cronExpression: string) => {
    // Check for common patterns
    if (cronExpression.match(/^\*\/(\d+) \* \* \* \*$/)) {
      // Every X minutes
      const minutes = cronExpression.match(/^\*\/(\d+) \* \* \* \*$/)?.[1];
      if (minutes) {
        const mins = parseInt(minutes, 10);
        // If the interval is smaller than minInterval and we're using the Simple tab,
        // switch to Advanced tab since we can't represent it in the Simple UI
        if (mins < minInterval) {
          setFrequency('custom');
          setSelectedTab('advanced');
          return;
        }
        setFrequency('minutes');
        setMinuteInterval(mins);
        setSelectedTab('simple');
        return;
      }
    } else if (cronExpression.match(/^(\d+) \* \* \* \*$/)) {
      // Specific minute every hour
      const minutes = cronExpression.match(/^(\d+) \* \* \* \*$/)?.[1];
      if (minutes) {
        setFrequency('hourly');
        setHourTime(`00:${minutes.padStart(2, '0')}`);
        setSelectedTab('simple');
        return;
      }
    } else if (cronExpression.match(/^(\d+) (\d+) \* \* \*$/)) {
      // Daily at specific time
      const match = cronExpression.match(/^(\d+) (\d+) \* \* \*$/);
      if (match) {
        const [, minutes, hours] = match;
        setFrequency('daily');
        setHourTime(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`);
        setSelectedTab('simple');
        return;
      }
    } else if (cronExpression.match(/^(\d+) (\d+) \* \* (\d+)$/)) {
      // Weekly on specific day and time
      const match = cronExpression.match(/^(\d+) (\d+) \* \* (\d+)$/);
      if (match) {
        const [, minutes, hours, day] = match;
        setFrequency('weekly');
        setWeekday(parseInt(day, 10));
        setHourTime(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`);
        setSelectedTab('simple');
        return;
      }
    } else if (cronExpression.match(/^(\d+) (\d+) (\d+) \* \*$/)) {
      // Monthly on specific day and time
      const match = cronExpression.match(/^(\d+) (\d+) (\d+) \* \*$/);
      if (match) {
        const [, minutes, hours, day] = match;
        setFrequency('monthly');
        setMonthDay(parseInt(day, 10));
        setHourTime(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`);
        setSelectedTab('simple');
        return;
      }
    }
    
    // If we get here, it's a custom expression
    setFrequency('custom');
    setSelectedTab('advanced');
  };

  // Generate cron expression based on simple selections
  const generateCronExpression = () => {
    const [hours, minutes] = hourTime.split(':').map(part => parseInt(part, 10));
    
    switch (frequency) {
      case 'minutes':
        return `*/${minuteInterval} * * * *`;
      case 'hourly':
        return `${minutes} * * * *`;
      case 'daily':
        return `${minutes} ${hours} * * *`;
      case 'weekly':
        return `${minutes} ${hours} * * ${weekday}`;
      case 'monthly':
        return `${minutes} ${hours} ${monthDay} * *`;
      default:
        return value;
    }
  };

  // Handle frequency change
  const handleFrequencyChange = (newFrequency: typeof frequency) => {
    setFrequency(newFrequency);
    
    // Update cron expression based on new frequency
    const newCronExpression = (() => {
      const [hours, minutes] = hourTime.split(':').map(part => parseInt(part, 10));
      
      switch (newFrequency) {
        case 'minutes':
          return `*/${minuteInterval} * * * *`;
        case 'hourly':
          return `${minutes} * * * *`;
        case 'daily':
          return `${minutes} ${hours} * * *`;
        case 'weekly':
          return `${minutes} ${hours} * * ${weekday}`;
        case 'monthly':
          return `${minutes} ${hours} ${monthDay} * *`;
        default:
          return value;
      }
    })();
    
    onChange(newCronExpression);
  };

  // Handle updates to the simple schedule form
  const handleSimpleScheduleUpdate = () => {
    const newCronExpression = generateCronExpression();
    onChange(newCronExpression);
  };
  
  // Format date as a string
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Generate day options for monthly selection
  const generateDayOptions = () => {
    const options = [];
    for (let i = 1; i <= 31; i++) {
      options.push(
        <option key={i} value={i}>
          {i}
          {getOrdinalSuffix(i)}
        </option>
      );
    }
    return options;
  };

  // Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Modified minute interval options based on minInterval
  const getMinuteIntervalOptions = () => {
    const defaultOptions = [1, 5, 10, 15, 30, 60];
    if (minInterval <= 1) return defaultOptions;
    
    // Filter out options less than minInterval
    return defaultOptions.filter(opt => opt >= minInterval);
  };

  return (
    <div className={`border rounded-lg ${compact ? 'p-3' : 'p-4'} bg-white ${className}`}>
      <div className={`flex mb-4 border-b ${compact ? 'gap-2' : ''}`}>
        <button
          onClick={() => setSelectedTab('simple')}
          className={`px-4 py-2 font-medium ${compact ? 'text-xs' : 'text-sm'} ${
            selectedTab === 'simple'
              ? 'text-blue-600 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Simple Schedule
        </button>
        <button
          onClick={() => setSelectedTab('advanced')}
          className={`px-4 py-2 font-medium ${compact ? 'text-xs' : 'text-sm'} ${
            selectedTab === 'advanced'
              ? 'text-blue-600 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Advanced (Cron Expression)
        </button>
      </div>

      {selectedTab === 'simple' ? (
        <div className={`space-y-${compact ? '3' : '4'}`}>
          <div>
            <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 mb-1`}>
              Frequency
            </label>
            <select
              className={`w-full px-3 ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              value={frequency}
              onChange={(e) => handleFrequencyChange(e.target.value as typeof frequency)}
            >
              <option value="minutes">Every few minutes</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {frequency === 'minutes' && (
            <div>
              <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 mb-1`}>
                Every
              </label>
              <div className="flex items-center">
                <select
                  className={`px-3 ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={minuteInterval}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value, 10);
                    setMinuteInterval(newValue);
                    onChange(`*/${newValue} * * * *`);
                  }}
                >
                  {getMinuteIntervalOptions().map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <span className="ml-2">minutes</span>
              </div>
            </div>
          )}

          {(frequency === 'hourly' || frequency === 'daily') && (
            <div>
              <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 mb-1`}>
                {frequency === 'hourly' ? 'At minute' : 'At time'}
              </label>
              <input
                type={frequency === 'hourly' ? 'number' : 'time'}
                className={`px-3 ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                value={frequency === 'hourly' ? hourTime.split(':')[1] : hourTime}
                min={frequency === 'hourly' ? 0 : undefined}
                max={frequency === 'hourly' ? 59 : undefined}
                onChange={(e) => {
                  if (frequency === 'hourly') {
                    const newMinute = e.target.value;
                    const paddedMinute = newMinute.padStart(2, '0');
                    setHourTime(`00:${paddedMinute}`);
                    onChange(`${parseInt(newMinute, 10)} * * * *`);
                  } else {
                    setHourTime(e.target.value);
                    const [hours, minutes] = e.target.value.split(':');
                    onChange(`${parseInt(minutes, 10)} ${parseInt(hours, 10)} * * *`);
                  }
                }}
              />
            </div>
          )}

          {frequency === 'weekly' && (
            <>
              <div>
                <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 mb-1`}>
                  On day
                </label>
                <select
                  className={`w-full px-3 ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={weekday}
                  onChange={(e) => {
                    const newDay = parseInt(e.target.value, 10);
                    setWeekday(newDay);
                    const [hours, minutes] = hourTime.split(':');
                    onChange(`${parseInt(minutes, 10)} ${parseInt(hours, 10)} * * ${newDay}`);
                  }}
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                </select>
              </div>
              <div>
                <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 mb-1`}>
                  At time
                </label>
                <input
                  type="time"
                  className={`px-3 ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={hourTime}
                  onChange={(e) => {
                    setHourTime(e.target.value);
                    const [hours, minutes] = e.target.value.split(':');
                    onChange(`${parseInt(minutes, 10)} ${parseInt(hours, 10)} * * ${weekday}`);
                  }}
                />
              </div>
            </>
          )}

          {frequency === 'monthly' && (
            <>
              <div>
                <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 mb-1`}>
                  On day of month
                </label>
                <select
                  className={`w-full px-3 ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={monthDay}
                  onChange={(e) => {
                    const newDay = parseInt(e.target.value, 10);
                    setMonthDay(newDay);
                    const [hours, minutes] = hourTime.split(':');
                    onChange(`${parseInt(minutes, 10)} ${parseInt(hours, 10)} ${newDay} * *`);
                  }}
                >
                  {generateDayOptions()}
                </select>
              </div>
              <div>
                <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 mb-1`}>
                  At time
                </label>
                <input
                  type="time"
                  className={`px-3 ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={hourTime}
                  onChange={(e) => {
                    setHourTime(e.target.value);
                    const [hours, minutes] = e.target.value.split(':');
                    onChange(`${parseInt(minutes, 10)} ${parseInt(hours, 10)} ${monthDay} * *`);
                  }}
                />
              </div>
            </>
          )}
        </div>
      ) : (
        <div>
          <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 mb-1`}>
            Cron Expression
          </label>
          <input
            type="text"
            className={`w-full px-3 ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              !isValid ? 'border-red-500' : ''
            }`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="*/5 * * * *"
          />
          {!isValid && (
            <p className="text-red-500 text-xs mt-1">Invalid cron expression format</p>
          )}
        </div>
      )}

      {showDescription && (
        <div className={`mt-3 text-gray-600 ${compact ? 'text-xs' : 'text-sm'} p-2 bg-gray-50 rounded`}>
          <div className={`font-medium text-gray-700 mb-1 ${compact ? 'text-xs' : ''}`}>Schedule Description:</div>
          <div>{cronDescription}</div>
        </div>
      )}

      {showNextRun && nextRunTime && (
        <div className={`mt-2 text-green-600 ${compact ? 'text-xs' : 'text-sm'}`}>
          Next run: {formatTime(nextRunTime)}
        </div>
      )}

      {selectedTab === 'advanced' && (
        <div className="mt-3 text-xs text-blue-600">
          <a 
            href="https://crontab.guru/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center hover:underline"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cron expression reference
          </a>
        </div>
      )}
    </div>
  );
}