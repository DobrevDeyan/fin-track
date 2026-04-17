/**
 * Custom hook for form state management
 */

import { useState, useCallback } from "react";
import { logger } from "@/lib/utils/logger";

export interface UseFormOptions<T> {
  initialValues: T;
  onSubmit?: (values: T) => void | Promise<void>;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
}

export interface FormField<T> {
  value: T;
  error?: string;
  touched: boolean;
}

export function useForm<T extends Record<string, any>>(options: UseFormOptions<T>) {
  const { initialValues, onSubmit, validate } = options;

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const setError = useCallback(<K extends keyof T>(field: K, error: string | undefined) => {
    setErrors((prev) => {
      if (error) {
        return { ...prev, [field]: error };
      } else {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }
    });
  }, []);

  const setFieldTouched = useCallback(<K extends keyof T>(field: K, touchedValue: boolean = true) => {
    setTouched((prev) => ({ ...prev, [field]: touchedValue }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Validate
    if (validate) {
      const validationErrors = validate(values);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        // Mark all fields as touched
        const allTouched = Object.keys(values).reduce((acc, key) => {
          acc[key as keyof T] = true;
          return acc;
        }, {} as Partial<Record<keyof T, boolean>>);
        setTouched(allTouched);
        return;
      }
    }

    // Submit
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (error) {
        logger.error("Form submission error", error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [values, validate, onSubmit]);

  const getFieldProps = useCallback(<K extends keyof T>(field: K) => {
    return {
      value: values[field],
      error: errors[field],
      touched: touched[field] || false,
      onChange: (value: T[K]) => setValue(field, value),
      onBlur: () => setFieldTouched(field, true),
    };
  }, [values, errors, touched, setValue, setFieldTouched]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setError,
    setFieldTouched,
    reset,
    handleSubmit,
    getFieldProps,
  };
}

