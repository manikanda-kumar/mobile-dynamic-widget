package experiments

import (
	"fmt"
	"math"
	"testing"

	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/model"
)

func twoWay() model.Experiment {
	return model.Experiment{
		ID:      "exp_offer_position",
		Enabled: true,
		Variants: []model.Variant{
			{ID: "A", Weight: 50},
			{ID: "B", Weight: 50},
		},
	}
}

func TestBucketIsStableAndInRange(t *testing.T) {
	for i := 0; i < 500; i++ {
		user := fmt.Sprintf("u_%d", i)
		b := Bucket(user, "exp_offer_position")
		if b < 0 || b > 99 {
			t.Fatalf("bucket %d out of range for %s", b, user)
		}
		if again := Bucket(user, "exp_offer_position"); again != b {
			t.Fatalf("bucket not deterministic for %s: %d then %d", user, b, again)
		}
	}
}

func TestBucketVariesByExperiment(t *testing.T) {
	same := 0
	for i := 0; i < 200; i++ {
		user := fmt.Sprintf("u_%d", i)
		if Bucket(user, "exp_a") == Bucket(user, "exp_b") {
			same++
		}
	}
	// Independent hashes collide ~1% of the time; anything near 200 means the
	// experiment id is not part of the hash input.
	if same > 40 {
		t.Fatalf("%d/200 users share a bucket across experiments; salt is not applied", same)
	}
}

func TestAssignIsDeterministic(t *testing.T) {
	exp := twoWay()
	for _, user := range []string{"u_priya", "u_arjun", "u_meera", "u_rahul", "anon"} {
		first := Assign(exp, user)
		if first == nil {
			t.Fatalf("no variant assigned for %s", user)
		}
		for i := 0; i < 25; i++ {
			again := Assign(exp, user)
			if again == nil || again.ID != first.ID {
				t.Fatalf("%s drifted from %s to %v", user, first.ID, again)
			}
		}
	}
}

func TestAssignDistributionRoughlyMatchesWeights(t *testing.T) {
	const n = 20000

	t.Run("50/50", func(t *testing.T) {
		exp := twoWay()
		counts := map[string]int{}
		for i := 0; i < n; i++ {
			v := Assign(exp, fmt.Sprintf("user-%d", i))
			counts[v.ID]++
		}
		assertShare(t, counts, n, map[string]float64{"A": 0.5, "B": 0.5}, 0.03)
	})

	t.Run("weights that do not sum to 100", func(t *testing.T) {
		exp := model.Experiment{
			ID:      "exp_fd_copy",
			Enabled: true,
			Variants: []model.Variant{
				{ID: "control", Weight: 2},
				{ID: "yield_first", Weight: 1},
				{ID: "safety_first", Weight: 1},
			},
		}
		counts := map[string]int{}
		for i := 0; i < n; i++ {
			v := Assign(exp, fmt.Sprintf("user-%d", i))
			counts[v.ID]++
		}
		assertShare(t, counts, n, map[string]float64{
			"control": 0.5, "yield_first": 0.25, "safety_first": 0.25,
		}, 0.03)
	})

	t.Run("skewed 90/10", func(t *testing.T) {
		exp := model.Experiment{
			ID:      "exp_skew",
			Enabled: true,
			Variants: []model.Variant{
				{ID: "A", Weight: 90},
				{ID: "B", Weight: 10},
			},
		}
		counts := map[string]int{}
		for i := 0; i < n; i++ {
			v := Assign(exp, fmt.Sprintf("user-%d", i))
			counts[v.ID]++
		}
		assertShare(t, counts, n, map[string]float64{"A": 0.9, "B": 0.1}, 0.03)
	})
}

func assertShare(t *testing.T, counts map[string]int, n int, want map[string]float64, tol float64) {
	t.Helper()
	for id, wantShare := range want {
		got := float64(counts[id]) / float64(n)
		if math.Abs(got-wantShare) > tol {
			t.Fatalf("variant %s share = %.3f, want %.3f ±%.2f (counts=%v)", id, got, wantShare, tol, counts)
		}
	}
	total := 0
	for _, c := range counts {
		total += c
	}
	if total != n {
		t.Fatalf("assignments = %d, want %d", total, n)
	}
}

func TestAssignSkipsDisabledAndDegenerate(t *testing.T) {
	disabled := twoWay()
	disabled.Enabled = false
	if v := Assign(disabled, "u_priya"); v != nil {
		t.Fatalf("disabled experiment assigned %v", v)
	}

	empty := model.Experiment{ID: "exp_empty", Enabled: true}
	if v := Assign(empty, "u_priya"); v != nil {
		t.Fatalf("experiment without variants assigned %v", v)
	}

	zeroWeights := model.Experiment{ID: "exp_zero", Enabled: true,
		Variants: []model.Variant{{ID: "A", Weight: 0}}}
	if v := Assign(zeroWeights, "u_priya"); v != nil {
		t.Fatalf("zero-weight experiment assigned %v", v)
	}
}

func TestAssignAllReportsBucketsAndSkipsDisabled(t *testing.T) {
	exps := []model.Experiment{
		twoWay(),
		{ID: "exp_disabled", Enabled: false, Variants: []model.Variant{{ID: "A", Weight: 100}}},
		{ID: "exp_rewards_layout", Enabled: true, Variants: []model.Variant{
			{ID: "A", Weight: 50}, {ID: "B", Weight: 50},
		}},
	}
	assignments, variants := AssignAll(exps, "u_priya")
	if len(assignments) != 2 {
		t.Fatalf("assignments = %d, want 2 (disabled experiment excluded)", len(assignments))
	}
	if len(variants) != 2 {
		t.Fatalf("variant map size = %d, want 2", len(variants))
	}
	for _, a := range assignments {
		if a.Bucket != Bucket("u_priya", a.ID) {
			t.Fatalf("reported bucket %d does not match hash for %s", a.Bucket, a.ID)
		}
		if a.Variant == "" {
			t.Fatalf("assignment %s has no variant", a.ID)
		}
	}
	if assignments[0].ID != "exp_offer_position" || assignments[1].ID != "exp_rewards_layout" {
		t.Fatalf("assignments must preserve data order, got %+v", assignments)
	}
}
