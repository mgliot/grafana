// SPDX-License-Identifier: AGPL-3.0-only

// Code generated by informer-gen. DO NOT EDIT.

package alerting_notifications

import (
	v0alpha1 "github.com/grafana/grafana/pkg/generated/informers/externalversions/alerting_notifications/v0alpha1"
	internalinterfaces "github.com/grafana/grafana/pkg/generated/informers/externalversions/internalinterfaces"
)

// Interface provides access to each of this group's versions.
type Interface interface {
	// V0alpha1 provides access to shared informers for resources in V0alpha1.
	V0alpha1() v0alpha1.Interface
}

type group struct {
	factory          internalinterfaces.SharedInformerFactory
	namespace        string
	tweakListOptions internalinterfaces.TweakListOptionsFunc
}

// New returns a new Interface.
func New(f internalinterfaces.SharedInformerFactory, namespace string, tweakListOptions internalinterfaces.TweakListOptionsFunc) Interface {
	return &group{factory: f, namespace: namespace, tweakListOptions: tweakListOptions}
}

// V0alpha1 returns a new v0alpha1.Interface.
func (g *group) V0alpha1() v0alpha1.Interface {
	return v0alpha1.New(g.factory, g.namespace, g.tweakListOptions)
}