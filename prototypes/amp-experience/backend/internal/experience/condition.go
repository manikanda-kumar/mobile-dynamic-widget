package experience

import (
	"fmt"
	"reflect"
)

type Condition struct {
	Op       string      `json:"op"`
	Fact     string      `json:"fact,omitempty"`
	Value    any         `json:"value,omitempty"`
	Children []Condition `json:"children,omitempty"`
}

func Evaluate(c Condition, facts map[string]any) (bool, error) {
	switch c.Op {
	case "all", "any":
		if len(c.Children) == 0 {
			return false, fmt.Errorf("%s requires children", c.Op)
		}
		for _, child := range c.Children {
			v, err := Evaluate(child, facts)
			if err != nil {
				return false, err
			}
			if c.Op == "all" && !v {
				return false, nil
			}
			if c.Op == "any" && v {
				return true, nil
			}
		}
		return c.Op == "all", nil
	case "not":
		if len(c.Children) != 1 {
			return false, fmt.Errorf("not requires one child")
		}
		v, err := Evaluate(c.Children[0], facts)
		return !v, err
	case "exists":
		_, ok := facts[c.Fact]
		return ok, nil
	case "eq", "neq", "in":
		got, ok := facts[c.Fact]
		if !ok {
			return false, fmt.Errorf("unknown fact %q", c.Fact)
		}
		if c.Op == "eq" {
			return reflect.DeepEqual(got, c.Value), nil
		}
		if c.Op == "neq" {
			return !reflect.DeepEqual(got, c.Value), nil
		}
		values, ok := c.Value.([]any)
		if !ok {
			return false, fmt.Errorf("in value must be a list")
		}
		for _, v := range values {
			if reflect.DeepEqual(got, v) {
				return true, nil
			}
		}
		return false, nil
	default:
		return false, fmt.Errorf("unknown operator %q", c.Op)
	}
}

func validateCondition(c Condition, known map[string]bool) error {
	switch c.Op {
	case "all", "any", "not":
		for _, child := range c.Children {
			if err := validateCondition(child, known); err != nil {
				return err
			}
		}
	case "eq", "neq", "in", "exists":
		if !known[c.Fact] {
			return fmt.Errorf("unknown fact %q", c.Fact)
		}
	default:
		return fmt.Errorf("unknown operator %q", c.Op)
	}
	_, err := EvaluateShape(c)
	return err
}

func EvaluateShape(c Condition) (bool, error) {
	if (c.Op == "all" || c.Op == "any") && len(c.Children) == 0 {
		return false, fmt.Errorf("%s requires children", c.Op)
	}
	if c.Op == "not" && len(c.Children) != 1 {
		return false, fmt.Errorf("not requires one child")
	}
	if c.Op == "in" {
		if _, ok := c.Value.([]any); !ok {
			return false, fmt.Errorf("in value must be a list")
		}
	}
	return true, nil
}
