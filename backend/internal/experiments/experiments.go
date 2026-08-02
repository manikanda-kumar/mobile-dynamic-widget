// Package experiments implements deterministic, hash-bucketed A/B assignment.
//
// Bucket = fnv32a(userId + ":" + experimentId) % 100, mapped through cumulative
// variant weights. The same user therefore always lands in the same variant for
// a given experiment, with no server-side state.
package experiments

import (
	"hash/fnv"

	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/model"
)

// Bucket returns the stable 0..99 bucket for a (user, experiment) pair.
func Bucket(userID, experimentID string) int {
	h := fnv.New32a()
	_, _ = h.Write([]byte(userID + ":" + experimentID))
	return int(h.Sum32() % 100)
}

// Assign picks the variant for a user, or nil when the experiment is disabled
// or has no usable variants.
func Assign(exp model.Experiment, userID string) *model.Variant {
	if !exp.Enabled || len(exp.Variants) == 0 {
		return nil
	}
	total := 0
	for _, v := range exp.Variants {
		if v.Weight > 0 {
			total += v.Weight
		}
	}
	if total <= 0 {
		return nil
	}

	bucket := Bucket(userID, exp.ID)
	// Scale the bucket into weight space so weights need not sum to 100.
	pos := bucket * total // compare against cum*100 to stay in integer math
	cum := 0
	for i := range exp.Variants {
		if exp.Variants[i].Weight <= 0 {
			continue
		}
		cum += exp.Variants[i].Weight
		if pos < cum*100 {
			return &exp.Variants[i]
		}
	}
	last := &exp.Variants[len(exp.Variants)-1]
	return last
}

// AssignAll returns the assignments for every enabled experiment, in data order.
func AssignAll(exps []model.Experiment, userID string) ([]model.ExperimentAssignment, map[string]model.Variant) {
	out := make([]model.ExperimentAssignment, 0, len(exps))
	variants := make(map[string]model.Variant, len(exps))
	for _, e := range exps {
		v := Assign(e, userID)
		if v == nil {
			continue
		}
		out = append(out, model.ExperimentAssignment{
			ID:      e.ID,
			Variant: v.ID,
			Bucket:  Bucket(userID, e.ID),
		})
		variants[e.ID] = *v
	}
	return out, variants
}
